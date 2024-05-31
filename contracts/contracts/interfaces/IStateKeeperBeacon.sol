// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/**
 * @notice Interface to handle omniverse transaction
 */
interface IStateKeeperBeacon {
    /**
     * @notice Checks if an omniverse transaction with the transaction id `txid` exists
     * @param txid The transaction id to be queried
     */
    function containsTxID(bytes32 txid) external returns (bool);
}
