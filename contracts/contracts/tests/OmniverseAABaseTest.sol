// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../interfaces/IOmniverseAA.sol";
import "../OmniverseAABase.sol";
import "../lib/Types.sol";

contract OmniverseAABaseTest is OmniverseAABase {
    using EnumerableUTXOMap for EnumerableUTXOMap.Bytes32ToUTXOMap;

    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof, bytes calldata signerPubkey, bytes calldata customData) external {

    }

    function updateSystemConfig(Types.SystemConfig calldata _sysConfig) public {
        sysConfig = _sysConfig;
    }

    function setLocalEntry(address _localEntry) public {
        sysConfig.localEntry = _localEntry;
    }

    function deploy(Types.Metadata calldata metadata) external {
        _constructDeploy(metadata);
    }

    function mint(bytes32 assetId, Types.Output[] calldata outputs) external {
        _constructMint(assetId, outputs);
    }

    function transfer(bytes32 assetId, Types.Output[] calldata outputs) external {
        _constructTransfer(assetId, outputs);
    }

    function getGas(Types.Output[] memory extraOutputs) external view returns (Types.Input[] memory, Types.Output[] memory) {
        return _getGas(extraOutputs);
    }

    function updateUTXOs(bytes32 assetId) public view returns (bytes32[] memory keys, uint256 len, bytes32[] memory txids) {
        EnumerableUTXOMap.Bytes32ToUTXOMap storage UTXOs = assetIdMapToUTXOSet[assetId];
        len = UTXOs.length();
        keys = new bytes32[](len);
        txids = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            (, Types.UTXO memory utxo) = UTXOs.at(i);
            bytes32 key = keccak256(
                abi.encodePacked(utxo.txid, utxo.index)
            );
            keys[i] = key;
            txids[i] = utxo.txid;
        }
    }

    function getAUTXO(bytes32 assetId, bytes32 key) public view returns (Types.UTXO memory utxo) {
        EnumerableUTXOMap.Bytes32ToUTXOMap storage UTXOs = assetIdMapToUTXOSet[assetId];
        utxo = UTXOs.get(key);
    }

    function removeAUTXO(bytes32 assetId, bytes32 key) public {
        EnumerableUTXOMap.Bytes32ToUTXOMap storage UTXOs = assetIdMapToUTXOSet[assetId];
        UTXOs.remove(key);
    }

    function update(bytes32 assetId, bytes32 txid, Types.Input[] calldata inputs, Types.Output[] calldata outputs) public {
        _updateUTXOs(assetId, txid, inputs, outputs);
    }
}
