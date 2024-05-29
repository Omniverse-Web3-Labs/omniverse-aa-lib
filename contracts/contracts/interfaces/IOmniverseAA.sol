// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./ILocalEntry.sol";

/**
 * @notice Signed omniverse transaction
 */
struct OmniverseTx {
    bytes32 txid;
    TxType txType;
    bytes txData;
}

uint128 constant GAS_FEE = 10;
uint256 constant MAX_UTXOs = 100;
bytes32 constant GAS_ASSET_ID = 0;
bytes32 constant GAS_RECEIVER = hex"1234567812345678123456781234567812345678123456781234567812345678";

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
     * @notice Returns public keys of the AA contract
     * @return publicKey Public key of the AA contract
     */
    function getPubkey() external view returns (bytes32 publicKey);

    /**
     * @notice Returns the next unsigned transaction which will be signed
     * @return txIndex The transaction index of which transaction to be signed
     * @return unsignedTx The next unsigned transaction
     */
    function getUnsignedTx() external view returns (uint256 txIndex, OmniverseTx memory unsignedTx);

    /**
     * @notice Handles an omniverse transaction sent from global exec server
     * @param omniTx The transaction data to be handled
     * @param merkleProof The merkle proof of omniverse transaction
     */
    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof) external;
}
