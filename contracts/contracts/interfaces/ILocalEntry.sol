// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "../lib/Types.sol";

/**
 * @notice Signed omniverse transaction
 */
struct SignedTx {
    bytes32 txid;
    Types.TxType txType;
    bytes txData;
}

/**
 * @notice Interface of local entry contract
 */
interface ILocalEntry {
    /**
     * @notice The AA contract registers pubkeys to local entry contract
     * @param pubkeys Public keys of AA contract
     */
    function register(bytes[] calldata pubkeys, bytes[] calldata signatures) external;

    /**
     * @notice Returns public keys of a specified AA contract
     * @param AAContract The address of the AA contract
     * @return pubkeys Public keys of the AA contract
     */
    function getPubkeys(address AAContract) external view returns (bytes[] memory pubkeys);

    /**
     * @notice Returns the Omniverse AA address bound with the specified public key
     * @param pubkey The public key to query
     * @return AAContract The Omniverse AA address
     */
    function getAAContract(bytes calldata pubkey) external view returns (address AAContract);

    /**
     * @notice The AA contract submits signed tx to the local entry contract
     * @param txType Omniverse transaction type
     * @param txData Omniverse transaction data
     * @param pubkey The public key which signs the transaction
     */
    function submitTx(Types.TxType txType, bytes calldata txData, bytes calldata pubkey) external;

    /**
     * @notice Returns transaction data of specified `txid`
     * @param txid The transaction id of which transaction to be queried
     * @return AAContract The AA contract which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransaction(bytes32 txid) external view returns (address AAContract, SignedTx memory signedTx);

    /**
     * @notice Returns transaction data of specified `index`
     * @param index The index of transaction to be queried, according to time sequence
     * @return AAContract The AA contract which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransactionByIndex(uint256 index) external view returns (address AAContract, SignedTx memory signedTx);

    /**
     * @notice Returns total transaction number
     * @return number Transaction number
     */
    function getTransactionNumber() external view returns (uint256 number);
}
