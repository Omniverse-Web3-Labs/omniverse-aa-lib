// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./ILocalEntrySC.sol";

/**
 * @notice Signed omniverse transaction
 */
struct UnsignedTx {
    TxType txType,
    bytes txData
}

/**
 * @notice Interface of AA transformer contract
 */
interface IAATransformer {
    /**
     * @notice AA signer submits signed transaction to AA transformer
     * @param txid The transaction id of which transaction to be submitted
     * @param signedTx The signed transaction encoded in bytes
     */
    function submitTx(txid: bytes32, SignedTx calldata signedTx) external;

    /**
     * @notice Returns public keys of the AA-transformer
     * @return pubkeys Public keys of the AA-transformer
     */
    function getPubkeys() external view returns (bytes memory pubkeys);

    /**
     * @notice Returns the next unsigned transaction which will be signed
     * @return unsignedTx The next unsigned transaction
     */
    function getUnsignedTx() external view returns (UnsignedTx unsignedTx);

    /**
     * @notice Handles an omniverse transaction sent from global exec server
     * @param txid The transaction id of which transaction to be handled
     */
    function handleOmniverseTx(bytes32 txid) external;
}
