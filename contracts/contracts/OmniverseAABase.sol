// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IOmniverseAA.sol";
import "./interfaces/ILocalEntry.sol";
import "./lib/Types.sol";
import "./lib/EnumerableUTXOMap.sol";
import "./lib/Utils.sol";
import "./interfaces/IOmniverseEIP712.sol";
import "./interfaces/IOmniverseSysConfigAA.sol";

abstract contract OmniverseAABase is IOmniverseAA {
    using EnumerableUTXOMap for EnumerableUTXOMap.Bytes32ToUTXOMap;

    // unsigned transaction list
    OmniverseTxWithTxid[] unsignedTxs;
    // next index of transation to be signed
    uint256 nextTxIndex;
    // uncompressed public key
    bytes AASignerPubkeyFull;
    // public key
    bytes32 AASignerPubkey;
    // the corresponding address of the public key
    address AASignerAddr;
    // asset id mapping to UTXO set
    mapping(bytes32 => EnumerableUTXOMap.Bytes32ToUTXOMap) assetIdMapToUTXOSet;
    // used to calculate Poseidon hash
    IPoseidon poseidon;
    // used to verify EIP712 signature
    IOmniverseEIP712 eip712;
    // system config
    Types.SystemConfig sysConfig;
    // handled transactions
    mapping(bytes32 => address) handledTxs;

    /**
     * @notice Throws when `onDeploy` not implemented
     */
    error OnDeployNotImplemented();

    /**
     * @notice Throws when `onMint` not implemented
     */
    error OnMintNotImplemented();

    /**
     * @notice Throws when `onTransfer` not implemented
     */
    error OnTransferNotImplemented();

    /**
     * @notice Throws when sender is not registered as AA contract signer
     * @param sender The sender calling the contract
     */
    error SenderNotRegistered(address sender);

    /**
     * @notice Throws when it failed to register signer
     * @param boundSigner The signer public key bound with the contract
     */
    error RegisterErrorWithSignerNotExpected(bytes32 boundSigner);

    /**
     * @notice Throws when the public key of AA signer already registered
     * @param pubkey The signer public key bound with the contract
     */
    error AASignerPublicKeyAlreadyRegistered(bytes32 pubkey);

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

    /**
     * @notice Throw when minting asset is gas
     */
    error GasTokenCanNotBeMinted();

    /**
     * @notice Throw if token name length larger than 24 when constructing deploy transaction
     * @param nameLength The real token name length
     */
    error TokenNameLengthExceedLimit(uint256 nameLength);

    constructor(address _sysConfig, bytes memory _AASignerPubkey, Types.UTXO[] memory _utxos, address _poseidon, address _eip712) {
        poseidon = IPoseidon(_poseidon);
        eip712 = IOmniverseEIP712(_eip712);

        for (uint i = 0; i < _utxos.length; i++) {
            bytes32 key = keccak256(
                abi.encodePacked(_utxos[i].txid, _utxos[i].index)
            );
            assetIdMapToUTXOSet[_utxos[i].assetId].set(key, _utxos[i]);
        }

        sysConfig = Types.SystemConfig(
            Types.FeeConfig(
                IOmniverseSysConfigAA(_sysConfig).gasAssetId(),
                IOmniverseSysConfigAA(_sysConfig).gasRecipient(),
                IOmniverseSysConfigAA(_sysConfig).gasFee()
            ),
            IOmniverseSysConfigAA(_sysConfig).maxUTXONumber(),
            IOmniverseSysConfigAA(_sysConfig).decimals(),
            IOmniverseSysConfigAA(_sysConfig).tokenNameLimit(),
            IOmniverseSysConfigAA(_sysConfig).stateKeeper(),
            IOmniverseSysConfigAA(_sysConfig).localEntry()
        );

        bytes32 _pubkey;
        assembly {
            _pubkey := mload(add(_AASignerPubkey, 32))
        }

        AASignerPubkey = _pubkey;
        AASignerPubkeyFull = _AASignerPubkey;

        if (ILocalEntry(sysConfig.localEntry).getAAContract(_AASignerPubkey) != address(0)) {
            revert AASignerPublicKeyAlreadyRegistered(AASignerPubkey);
        }
    }

    /**
     * @notice AA signer submits signed transaction to AA contract
     * @param txIndex The transaction index of which transaction to be submitted
     * @param signature The signature for the transaction
     */
    function submitTx(uint256 txIndex, bytes calldata signature) external {
        if (AASignerAddr != msg.sender) {
            revert SenderNotRegistered(msg.sender);
        }

        if (nextTxIndex >= unsignedTxs.length) {
            revert TransactionNotExists(txIndex);
        }
        
        if (txIndex != nextTxIndex) {
            revert TransactionIndexNotMatch(nextTxIndex, txIndex);
        }

        OmniverseTxWithTxid storage omniTx = unsignedTxs[nextTxIndex];

        ILocalEntry(sysConfig.localEntry).submitTx(SignedTx(omniTx.txid, omniTx.otx.txType, omniTx.otx.txData, signature), AASignerPubkeyFull);

        nextTxIndex++;
    }

    /**
     * @notice Returns UTXOs of an asset
     * @param assetId The asset id of UTXOs to be queried
     * @return UTXOs UTXOs with the asset id `assetId`
     */
    function getUTXOs(bytes32 assetId) external view returns (Types.UTXO[] memory UTXOs) {
        EnumerableUTXOMap.Bytes32ToUTXOMap storage UTXOsOfAsset = assetIdMapToUTXOSet[assetId];
        UTXOs = new Types.UTXO[](UTXOsOfAsset.length());
        for (uint i = 0; i < UTXOs.length; i++) {
            (, Types.UTXO memory utxo) = UTXOsOfAsset.at(i);
            UTXOs[i] = utxo;
        }

        return UTXOs;
    }

    /**
     * @notice Returns public keys of the AA contract
     * @return publicKey Public keys of the AA contract
     */
    function getPubkey() external view returns (bytes32 publicKey) {
        return AASignerPubkey;
    }

    /**
     * @notice Returns the next unsigned transaction which will be signed
     * @return txIndex The transaction index of which transaction to be signed
     * @return unsignedTx The next unsigned transaction
     */
    function getUnsignedTx() external view returns (uint256 txIndex, OmniverseTxWithTxid memory unsignedTx) {
        if (nextTxIndex < unsignedTxs.length) {
            txIndex = nextTxIndex;
            unsignedTx = unsignedTxs[nextTxIndex];
        }
    }

    /**
     * @notice Register AA to Local Entry contract
     * @param uncompressedPublicKey Uncompress public key
     * @param signature The signature signed by AA private key
     */
    function register(bytes calldata uncompressedPublicKey, bytes calldata signature) public {
        bytes32 _pubkey;
        assembly {
            _pubkey := calldataload(add(uncompressedPublicKey.offset, 0))
        }
        
        if (_pubkey != AASignerPubkey) {
            revert RegisterErrorWithSignerNotExpected(AASignerPubkey);
        }
        AASignerAddr = Utils.pubKeyToAddress(uncompressedPublicKey);

        bytes[] memory publicKeys = new bytes[](1);
        publicKeys[0] = uncompressedPublicKey;
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = signature;
        ILocalEntry(sysConfig.localEntry).register(publicKeys, signatures);
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
            bytes32 key = keccak256(
                abi.encodePacked(inputs[i].txid, inputs[i].index)
            );
            UTXOs.remove(key);
        }

        // add new UTXOs
        for (uint64 i = 0; i < outputs.length; i++) {
            if (outputs[i].omniAddress != AASignerPubkey) {
                continue;
            }
            
            bytes32 key = keccak256(
                abi.encodePacked(txid, i)
            );
            UTXOs.set(key, Types.UTXO(
                AASignerPubkey,
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
        uint128 neededGasFee = sysConfig.feeConfig.amount;
        for (uint i = 0; i < extraOutputs.length; i++) {
            neededGasFee += extraOutputs[i].amount;
        }

        // find gas UTXOs
        uint256 inputUTXONum = 0;
        uint128 inputGas = 0;
        EnumerableUTXOMap.Bytes32ToUTXOMap storage gasUTXOs = assetIdMapToUTXOSet[sysConfig.feeConfig.assetId];
        for (uint i = 0; i < gasUTXOs.length(); i++) {
            (, Types.UTXO memory utxo) = gasUTXOs.at(i);
            inputGas += utxo.amount;
            inputUTXONum++;
            if (inputGas >= neededGasFee) {
                break;
            }
        }

        if (inputGas < neededGasFee) {
            revert TokenOfAAContractNotEnough(sysConfig.feeConfig.assetId);
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
                AASignerPubkey,
                inputGas - neededGasFee
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
            sysConfig.feeConfig.receiver,
            sysConfig.feeConfig.amount
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
                AASignerPubkey,
                inputAmount - neededAmount
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

        if (bytes(metadata.name).length > sysConfig.tokenNameLimit) {
            revert TokenNameLengthExceedLimit(bytes(metadata.name).length);
        }

        deployTx = Types.Deploy(
            metadata,
            "0x",
            gasInputs,
            gasOutputs
        );

        bytes memory txDataPacked = Utils.deployToBytes(deployTx);
        txid = Utils.calTxId(txDataPacked, poseidon);

        if (gasInputs.length + gasOutputs.length > sysConfig.maxTxUTXO) {
            revert UTXONumberExceedLimit(gasInputs.length + gasOutputs.length);
        }

        _updateUTXOs(sysConfig.feeConfig.assetId, txid, gasInputs, gasOutputs);

        bytes memory txData = abi.encode(deployTx);
        unsignedTxs.push(OmniverseTxWithTxid(
            txid,
            OmniverseTx(
                Types.TxType.Deploy,
                txData
            )
        ));
    }

    /**
     * @notice Construct Omniverse `Mint` transaction
     * @param assetId The asset id of the omniverse token
     * @param outputs Expected outputs of the transaction
     * @return txid The new transaction id
     * @return mintTx Constructed Omniverset Mint transaction
     */
    function _constructMint(bytes32 assetId, Types.Output[] memory outputs) internal returns (bytes32 txid, Types.Mint memory mintTx) {
        if (assetId == sysConfig.feeConfig.assetId) {
            revert GasTokenCanNotBeMinted();
        }
        
        (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) = _getGas(new Types.Output[](0));

        mintTx = Types.Mint(
            assetId,
            "0x",
            outputs,
            gasInputs,
            gasOutputs
        );

        bytes memory txDataPacked = Utils.MintToBytes(mintTx);
        txid = Utils.calTxId(txDataPacked, poseidon);

        if (outputs.length + gasInputs.length + gasOutputs.length > sysConfig.maxTxUTXO) {
            revert UTXONumberExceedLimit(outputs.length + gasInputs.length + gasOutputs.length);
        }

        // update gas UTXOs
        _updateUTXOs(sysConfig.feeConfig.assetId, txid, gasInputs, gasOutputs);

        // update token UTXOs
        _updateUTXOs(assetId, txid, new Types.Input[](0), outputs);

        bytes memory txData = abi.encode(mintTx);
        unsignedTxs.push(OmniverseTxWithTxid(
            txid,
            OmniverseTx(
                Types.TxType.Mint,
                txData
            )
        ));
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
        if (assetId == sysConfig.feeConfig.assetId) {
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

            bytes memory txDataPacked = Utils.TransferToBytes(transferTx);
            txid = Utils.calTxId(txDataPacked, poseidon);

            // update gas UTXOs
            _updateUTXOs(sysConfig.feeConfig.assetId, txid, gasInputs, gasOutputs);
        }
        else {
            (Types.Input[] memory gasInputs, Types.Output[] memory gasOutputs) = _getGas(new Types.Output[](0));
            (Types.Input[] memory inputs, Types.Output[] memory outputs) = _preTransfer(assetId, expectedOutputs);

            transferTx = Types.Transfer(
                assetId,
                "0x",
                inputs,
                outputs,
                gasInputs,
                gasOutputs
            );

            UTXONumber = inputs.length + outputs.length + gasInputs.length + gasOutputs.length;

            bytes memory txDataPacked = Utils.TransferToBytes(transferTx);
            txid = Utils.calTxId(txDataPacked, poseidon);

            // update gas UTXOs
            _updateUTXOs(sysConfig.feeConfig.assetId, txid, gasInputs, gasOutputs);

            // update token UTXOs
            _updateUTXOs(assetId, txid, inputs, outputs);
        }

        if (UTXONumber > sysConfig.maxTxUTXO) {
            revert UTXONumberExceedLimit(UTXONumber);
        }

        bytes memory txData = abi.encode(transferTx);
        unsignedTxs.push(OmniverseTxWithTxid(
            txid,
            OmniverseTx(
                Types.TxType.Transfer,
                txData
            )
        ));
    }

    /**
     * @notice Called when an omniverse transaction is Deploy
     * @param txid The Omniverse transaction id
     * @param signer The corresponding ETH address of the Omniverse signer
     * @param data Deploy data
     * @param customData Custom data submitted by user
     */
    function onDeploy(bytes32 txid, address signer, Types.Deploy memory data, bytes memory customData) internal virtual {
        revert OnDeployNotImplemented();
    }

    /**
     * @notice Called when an omniverse transaction is Mint
     * @param txid The Omniverse transaction id
     * @param signer The corresponding ETH address of the Omniverse signer
     * @param data Mint data
     * @param customData Custom data submitted by user
     */
    function onMint(bytes32 txid, address signer, Types.Mint memory data, bytes memory customData) internal virtual {
        revert OnMintNotImplemented();
    }

    /**
     * @notice Called when an omniverse transaction is Transfer
     * @param txid The Omniverse transaction id
     * @param signer The corresponding ETH address of the Omniverse signer
     * @param data Transfer data
     * @param customData Custom data submitted by user
     */
    function onTransfer(bytes32 txid, address signer, Types.Transfer memory data, bytes memory customData) internal virtual {
        revert OnTransferNotImplemented();
    }
}
