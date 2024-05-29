// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IOmniverseAA.sol";
import "./interfaces/ILocalEntry.sol";
import "./lib/Types.sol";
import "./lib/EnumerableUTXOMap.sol";
import "./lib/Utils.sol";

abstract contract OmniverseAABase is IOmniverseAA {
    using EnumerableUTXOMap for EnumerableUTXOMap.Bytes32ToUTXOMap;

    // address of local entry contract
    address localEntry;
    // address of state keeper on the chain
    address stateKeeper;
    // unsigned transaction list
    OmniverseTx[] unsignedTxs;
    // next index of transation to be signed
    uint256 nextTxIndex;
    // public key
    bytes32 pubkey;
    // the corresponding address of the pubkey
    address addrPubkey;
    // asset id mapping to UTXO set
    mapping(bytes32 => EnumerableUTXOMap.Bytes32ToUTXOMap) assetIdMapToUTXOSet;
    // used to calculate Poseidon hash
    IPoseidon poseidon;

    /**
     * @notice Throws when sender is not registered as AA contract signer
     * @param sender The sender calling the contract
     */
    error SenderNotRegistered(address sender);

    /**
     * @notice Throws when a transaction submitted to the contract not exists
     * @param txIndex The transaction index
     */
    error TransactionNotExists(uint256 txIndex);

    /**
     * @notice Throws when the index of submitted transaction not match the expected transaction index
     */
    error TransactionIndexNotMatch(uint256 expected, uint256 submitted);

    /**
     * @notice Throws when the AA contract does not have enough gas for a transaction
     * @param assetId The asset id of the omniverse token
     */
    error TokenOfAAContractNotEnough(bytes32 assetId);

    /**
     * @notice Throw when used UTXO number exceed limit
     * @param number The real UTXO number in the omniverse transaction
     */
    error UTXONumberExceedLimit(uint256 number);

    constructor(bytes memory uncompressedPublicKey, Types.UTXO[] memory utxos, IPoseidon _poseidon) {
        poseidon = _poseidon;

        bytes32 _pubkey;
        assembly {
            _pubkey := mload(uncompressedPublicKey)
        }
        pubkey = _pubkey;
        addrPubkey = Utils.pubKeyToAddress(uncompressedPublicKey);

        for (uint i = 0; i < utxos.length; i++) {
            bytes32 key = keccak256(
                abi.encodePacked(utxos[i].txid, utxos[i].index)
            );
            assetIdMapToUTXOSet[utxos[i].assetId].set(key, utxos[i]);
        }
    }

    /**
     * @notice AA signer submits signed transaction to AA contract
     * @param txIndex The transaction index of which transaction to be submitted
     * @param signature The signature for the transaction
     */
    function submitTx(uint256 txIndex, bytes calldata signature) external {
        if (addrPubkey == msg.sender) {
            revert SenderNotRegistered(msg.sender);
        }

        if (nextTxIndex >= unsignedTxs.length) {
            revert TransactionNotExists(txIndex);
        }
        
        if (txIndex != nextTxIndex) {
            revert TransactionIndexNotMatch(nextTxIndex, txIndex);
        }

        OmniverseTx storage omniTx = unsignedTxs[nextTxIndex];

        ILocalEntry(localEntry).submitTx(SignedTx(omniTx.txid, omniTx.txType, omniTx.txData, signature));

        nextTxIndex++;
    }

    /**
     * @notice Returns public keys of the AA contract
     * @return publicKey Public keys of the AA contract
     */
    function getPubkey() external view returns (bytes32 publicKey) {
        return pubkey;
    }

    /**
     * @notice Returns the next unsigned transaction which will be signed
     * @return txIndex The transaction index of which transaction to be signed
     * @return unsignedTx The next unsigned transaction
     */
    function getUnsignedTx() external view returns (uint256 txIndex, OmniverseTx memory unsignedTx) {
        if (nextTxIndex < unsignedTxs.length) {
            txIndex = nextTxIndex;
            unsignedTx = unsignedTxs[nextTxIndex];
        }
    }

    /**
     * @notice Update UTXOs stored in the contract
     * @param assetId The asset id of these outputs
     * @param txid The new transaction id
     * @param inputs The inputs of an omniverse transaction
     * @param outputs The outputs of an omniverse transaction
     */
    function _updateUTXOs(bytes32 assetId, bytes32 txid, Types.Input[] memory inputs, Types.Output[] memory outputs) internal {
        EnumerableUTXOMap.Bytes32ToUTXOMap storage UTXOs = assetIdMapToUTXOSet[assetId];
        // update UTXOs
        // remove old UTXOs
        for (uint i = 0; i < inputs.length; i++) {
            UTXOs.remove(inputs[i].txid);
        }

        // add new UTXOs
        for (uint64 i = 0; i < outputs.length; i++) {
            if (outputs[i].omniAddress != pubkey) {
                continue;
            }
            
            bytes32 key = keccak256(
                abi.encodePacked(txid, i)
            );
            UTXOs.set(key, Types.UTXO(
                pubkey,
                assetId,
                txid,
                i,
                outputs[i].amount
            ));
        }
    }

    /**
     * @notice Returns the gas inputs and gas outputs of an omniverse transaction
     * @param extraOutputs Extra gas outputs, used in omniverse transfer where the transferred asset is gas token
     * @return gasInputs Gas inputs in an omniverse transaction
     * @return gasOutputs Gas outputs in an omniverse transaction
     */
    function _getGas(Types.Output[] memory extraOutputs) internal view returns (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) {
        // calculate needed gas fee
        uint128 neededGasFee = GAS_FEE;
        for (uint i = 0; i < extraOutputs.length; i++) {
            neededGasFee += extraOutputs[i].amount;
        }

        // find gas UTXOs
        uint256 inputUTXONum = 0;
        uint128 inputGas = 0;
        EnumerableUTXOMap.Bytes32ToUTXOMap storage gasUTXOs = assetIdMapToUTXOSet[GAS_ASSET_ID];
        for (uint i = 0; i < gasUTXOs.length(); i++) {
            (, Types.UTXO memory utxo) = gasUTXOs.at(i);
            inputGas += utxo.amount;
            inputUTXONum++;
            if (inputGas >= neededGasFee) {
                break;
            }
        }

        if (inputGas < neededGasFee) {
            revert TokenOfAAContractNotEnough(GAS_ASSET_ID);
        }

        // construct inputs
        gasInputs = new Types.Input[](inputUTXONum);
        for (uint i = 0; i < inputUTXONum; i++) {
            (, Types.UTXO memory utxo) = gasUTXOs.at(i);
            gasInputs[i] = Types.Input(
                utxo.txid,
                utxo.index,
                utxo.amount,
                utxo.omniAddress
            );
        }

        // construct outputs
        if (inputGas > neededGasFee) {
            gasOutputs = new Types.Output[](extraOutputs.length + 2);
            // charge
            gasOutputs[extraOutputs.length + 1] = Types.Output(
                pubkey,
                neededGasFee - inputGas
            );
        }
        else {
            gasOutputs = new Types.Output[](extraOutputs.length + 1);
        }
        
        // transfer
        for (uint i = 0; i < extraOutputs.length; i++) {
            gasOutputs[i] = extraOutputs[i];
        }

        // gas fee
        gasOutputs[extraOutputs.length] = Types.Output(
            GAS_RECEIVER,
            GAS_FEE
        );
    }

    /**
     * @notice Returns inputs and outputs for constructing a `Transfer` transaction, the token MUST not be the gas token
     * @param assetId The asset id of the omniverse token
     * @param outputsNeeded Outputs the user want to include in a `Transfer` transaction
     * @return inputs Inputs which should be included in the `Transfer` transaction
     * @return outputs Outputs which should be include in the `Transfer ` transaction
     */
    function _preTransfer(bytes32 assetId, Types.Output[] memory outputsNeeded) internal view returns (Types.Input[] memory inputs, Types.Output[] memory outputs) {
        // calculate needed gas fee
        uint128 neededAmount = 0;
        for (uint i = 0; i < outputsNeeded.length; i++) {
            neededAmount += outputsNeeded[i].amount;
        }

        // find token UTXOs
        uint256 inputUTXONum = 0;
        uint128 inputAmount = 0;
        EnumerableUTXOMap.Bytes32ToUTXOMap storage tokenUTXOs = assetIdMapToUTXOSet[assetId];
        for (uint i = 0; i < tokenUTXOs.length(); i++) {
            (, Types.UTXO memory utxo) = tokenUTXOs.at(i);
            inputAmount += utxo.amount;
            inputUTXONum++;
            if (inputAmount >= neededAmount) {
                break;
            }
        }

        if (inputAmount < neededAmount) {
            revert TokenOfAAContractNotEnough(assetId);
        }

        // construct inputs
        inputs = new Types.Input[](inputUTXONum);
        for (uint i = 0; i < inputUTXONum; i++) {
            (, Types.UTXO memory utxo) = tokenUTXOs.at(i);
            inputs[i] = Types.Input(
                utxo.txid,
                utxo.index,
                utxo.amount,
                utxo.omniAddress
            );
        }

        // construct outputs
        if (inputAmount > neededAmount) {
            outputs = new Types.Output[](outputsNeeded.length + 1);
            // charge
            outputs[outputsNeeded.length] = Types.Output(
                pubkey,
                neededAmount - inputAmount
            );
        }
        else {
            outputs = new Types.Output[](outputsNeeded.length);
        }
        
        // transfer
        for (uint i = 0; i < outputsNeeded.length; i++) {
            outputs[i] = outputsNeeded[i];
        }
    }

    /**
     * @notice Construct Omniverse `Deploy` transaction
     * @param metadata The metadata of Omniverse token to be deployed
     * @return txid The new transaction id
     * @return deployTx Constructed Omniverset Deploy transaction
     */
    function _constructDeploy(Types.Metadata memory metadata) internal returns (bytes32 txid, Types.Deploy memory deployTx) {
        (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) = _getGas(new Types.Output[](0));

        deployTx = Types.Deploy(
            metadata,
            "0x",
            gasInputs,
            gasOutputs
        );

        bytes memory txData = Utils.deployToBytes(deployTx);
        txid = Utils.calTxId(txData, poseidon);

        if (gasInputs.length + gasOutputs.length > MAX_UTXOs) {
            revert UTXONumberExceedLimit(gasInputs.length + gasOutputs.length);
        }

        _updateUTXOs(GAS_ASSET_ID, txid, gasInputs, gasOutputs);
    }

    /**
     * @notice Construct Omniverse `Mint` transaction
     * @param assetId The asset id of the omniverse token
     * @param outputs Expected outputs of the transaction
     * @return txid The new transaction id
     * @return mintTx Constructed Omniverset Mint transaction
     */
    function _constructMint(bytes32 assetId, Types.Output[] memory outputs) internal returns (bytes32 txid, Types.Mint memory mintTx) {
        (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) = _getGas(new Types.Output[](0));

        mintTx = Types.Mint(
            assetId,
            "0x",
            outputs,
            gasInputs,
            gasOutputs
        );

        bytes memory txData = Utils.MintToBytes(mintTx);
        txid = Utils.calTxId(txData, poseidon);

        // update gas UTXOs
        _updateUTXOs(GAS_ASSET_ID, txid, gasInputs, gasOutputs);

        // update token UTXOs
        _updateUTXOs(assetId, txid, new Types.Input[](0), outputs);
    }

    /**
     * @notice Construct Omniverse `Transfer` transaction
     * @param assetId The asset id of the omniverse token
     * @param expectedOutputs Expected outputs of the transaction
     * @return txid The new transaction id
     * @return transferTx Constructed Omniverset Transfer transaction
     */
    function _constructTransfer(bytes32 assetId, Types.Output[] memory expectedOutputs) internal returns (bytes32 txid, Types.Transfer memory transferTx) {
        uint256 UTXONumber = 0;
        if (assetId == GAS_ASSET_ID) {
            (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) = _getGas(expectedOutputs);

            transferTx = Types.Transfer(
                assetId,
                "0x",
                new Types.Input[](0),
                new Types.Output[](0),
                gasInputs,
                gasOutputs
            );

            UTXONumber = gasInputs.length + gasOutputs.length;

            bytes memory txData = Utils.TransferToBytes(transferTx);
            txid = Utils.calTxId(txData, poseidon);

            // update gas UTXOs
            _updateUTXOs(GAS_ASSET_ID, txid, gasInputs, gasOutputs);
        }
        else {
            (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) = _getGas(new Types.Output[](0));
            (Types.Input[] memory inputs, Types.Output[] memory outputs) = _preTransfer(assetId, expectedOutputs);

            transferTx = Types.Transfer(
                assetId,
                "0x",
                gasInputs,
                gasOutputs,
                inputs,
                outputs
            );

            UTXONumber = inputs.length + outputs.length + gasInputs.length + gasOutputs.length;

            bytes memory txData = Utils.TransferToBytes(transferTx);
            txid = Utils.calTxId(txData, poseidon);

            // update gas UTXOs
            _updateUTXOs(GAS_ASSET_ID, txid, gasInputs, gasOutputs);

            // update token UTXOs
            _updateUTXOs(assetId, txid, inputs, outputs);
        }

        if (UTXONumber > MAX_UTXOs) {
            revert UTXONumberExceedLimit(UTXONumber);
        }
    }
}
