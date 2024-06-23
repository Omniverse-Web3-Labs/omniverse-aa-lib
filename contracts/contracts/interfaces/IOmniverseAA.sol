// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./ILocalEntry.sol";
import "../lib/Types.sol";

/**
 * @notice Unsigned omniverse transaction
 */
struct OmniverseTx {
    Types.TxType txType;
    bytes txData;
}

/**
 * @notice Unsigned omniverse transaction with txid
 */
struct OmniverseTxWithTxid {
    bytes32 txid;
    OmniverseTx otx;
}

/**
 * @notice Interface of Omniverse AA contract
 */
interface IOmniverseAA {
    /**
     * @notice AA signer submits signed transaction to AA contract
     * @param txIndex The transaction index of which transaction to be submitted
     * @param signature The signature for the transaction
     */
    function submitTx(uint256 txIndex, bytes calldata signature) external;

    /**
     * @notice Returns UTXOs of an asset
     * @param assetId The asset id of UTXOs to be queried
     * @return UTXOs UTXOs with the asset id `assetId`
     */
    function getUTXOs(bytes32 assetId) external view returns (Types.UTXO[] memory UTXOs);

    /**
     * @notice Returns public keys of the AA contract
     * @return publicKey Public key of the AA contract
     */
    function getPubkey() external view returns (bytes32 publicKey);

    /**
     * @notice Returns the next unsigned transaction which will be signed
     * @return txIndex The transaction index of which transaction to be signed
     * @return unsignedTx The next unsigned transaction
     */
    function getUnsignedTx() external view returns (uint256 txIndex, OmniverseTxWithTxid memory unsignedTx);
}
