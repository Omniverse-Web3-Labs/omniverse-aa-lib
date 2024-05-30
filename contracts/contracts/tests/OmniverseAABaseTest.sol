// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../interfaces/IOmniverseAA.sol";
import "../OmniverseAABase.sol";
import "../lib/Types.sol";

contract OmniverseAABaseTest is OmniverseAABase {
    constructor(bytes memory uncompressedPublicKey, Types.UTXO[] memory utxos, IPoseidon _poseidon) OmniverseAABase(uncompressedPublicKey, utxos, _poseidon) {
    }

    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof) external {

    }

    function updateSystemConfig(Types.SystemConfig calldata _sysConfig) public {
        sysConfig = _sysConfig;
    }

    function setLocalEntry(address _localEntry) public {
        localEntry = _localEntry;
    }

    function deploy(Types.Metadata calldata metadata) external {
        (bytes32 txid, Types.Deploy memory deployTx) = _constructDeploy(metadata);
        bytes memory txData = abi.encode(deployTx);
        unsignedTxs.push(OmniverseTx(
            txid,
            TxType.Deploy,
            txData
        ));
    }

    function mint(bytes32 assetId, Types.Output[] calldata outputs) external {
        (bytes32 txid, Types.Mint memory mintTx) = _constructMint(assetId, outputs);
        bytes memory txData = abi.encode(mintTx);
        unsignedTxs.push(OmniverseTx(
            txid,
            TxType.Mint,
            txData
        ));
    }

    function transfer(bytes32 assetId, Types.Output[] calldata outputs) external {
        (bytes32 txid, Types.Transfer memory transferTx) = _constructTransfer(assetId, outputs);
        bytes memory txData = abi.encode(transferTx);
        unsignedTxs.push(OmniverseTx(
            txid,
            TxType.Transfer,
            txData
        ));
    }
}
