// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../interfaces/IOmniverseAA.sol";
import "../OmniverseAABase.sol";
import "../lib/Types.sol";

contract OmniverseAABaseTest is OmniverseAABase {
    constructor(bytes memory uncompressedPublicKey, Types.UTXO[] memory utxos, address _poseidon, address _eip712) OmniverseAABase(uncompressedPublicKey, utxos, _poseidon, _eip712) {
    }

    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof, bytes calldata signerPubkey, bytes calldata customData) external {

    }

    function updateSystemConfig(Types.SystemConfig calldata _sysConfig) public {
        sysConfig = _sysConfig;
    }

    function setLocalEntry(address _localEntry) public {
        sysConfig.localEntry = _localEntry;
    }

    function deploy(Types.Metadata calldata metadata) external {
        (bytes32 txid, Types.Deploy memory deployTx) = _constructDeploy(metadata);
    }

    function mint(bytes32 assetId, Types.Output[] calldata outputs) external {
        (bytes32 txid, Types.Mint memory mintTx) = _constructMint(assetId, outputs);
    }

    function transfer(bytes32 assetId, Types.Output[] calldata outputs) external {
        (bytes32 txid, Types.Transfer memory transferTx) = _constructTransfer(assetId, outputs);
    }
}
