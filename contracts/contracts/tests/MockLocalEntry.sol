// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../interfaces/ILocalEntry.sol";

contract MockLocalEntry is ILocalEntry {
    bool public submitRet;
    bool registered;
    uint256 txNumber;
    error SubmitToLocalEntryFailed();

    error SenderNotRegistered(address sender);

    constructor() {
        submitRet = true;
    }

    function setSubmitRet(bool ret) public {
        submitRet = ret;
    }

    /**
     * @notice The AA contract registers pubkeys to local entry contract
     * @param pubkeys Public keys of AA contract
     */
    function register(bytes[] calldata pubkeys, bytes[] calldata signatures) external {
        registered = true;
    }

    /**
     * @notice Returns public keys of a specified AA contract
     * @param AAContract The address of the AA contract
     * @return pubkeys Public keys of the AA contract
     */
    function getPubkeys(address AAContract) external view returns (bytes[] memory pubkeys) {

    }/**
     * @notice Returns the Omniverse AA address bound with the specified public key
     * @param pubkey The public key to query
     * @return AAContract The Omniverse AA address
     */
    function getAAContract(bytes calldata pubkey) external view returns (address AAContract) {
        if (registered) {
            return address(this);
        }
        else {
            return address(0);
        }
    }

    /**
     * @notice The AA contract submits signed tx to the local entry contract
     * @param signedTx Signed omniverse transaction
     */
    function submitTx(SignedTx calldata signedTx) external {
        if (!registered) {
            revert SenderNotRegistered(msg.sender);
        }

        if (!submitRet) {
            revert SubmitToLocalEntryFailed();
        }

        txNumber++;
    }

    /**
     * @notice Returns transaction data of specified `txid`
     * @param txid The transaction id of which transaction to be queried
     * @return AAContract The AA contract which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransaction(bytes32 txid) external view returns (address AAContract, SignedTx memory signedTx) {

    }

    /**
     * @notice Returns transaction data of specified `index`
     * @param index The index of transaction to be queried, according to time sequence
     * @return AAContract The AA contract which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransactionByIndex(uint256 index) external view returns (address AAContract, SignedTx memory signedTx) {

    }

    function getTransactionNumber() external view returns (uint256 number) {
        number = txNumber;
    }}
