// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/**
 * @notice Omniverse transaction type
 */
enum TxType {
    Deploy,
    Mint,
    Transfer
}

/**
 * @notice Signed omniverse transaction
 */
struct SignedTx {
    bytes32 txid;
    TxType txType;
    bytes txData;
    bytes signature;
}

/**
 * @notice Interface of local entry contract
 */
interface ILocalEntrySC {
    /**
     * @notice The AA-transformer registers pubkeys to local entry contract
     * @param pubkeys Public keys of AA transformer
     */
    function register(bytes[] calldata pubkeys, bytes[] calldata signatures) external;

    /**
     * @notice Returns public keys of a specified AA-transformer
     * @param transformer The address of the AA-transformer
     * @return pubkeys Public keys of the AA-transformer
     */
    function getPubkeys(address transformer) external view returns (bytes[] memory pubkeys);

    /**
     * @notice The AA-transformer submits signed tx to the local entry contract
     * @param signedTx Signed omniverse transaction
     */
    function submitTx(SignedTx calldata signedTx) external;

    /**
     * @notice Returns transaction data of specified `txid`
     * @param txid The transaction id of which transaction to be queried
     * @return transformer The AA-transform which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransaction(bytes32 txid) external view returns (address transformer, SignedTx memory signedTx);

    /**
     * @notice Returns transaction data of specified `index`
     * @param index The index of transaction to be queried, according to time sequence
     * @return transformer The AA-transform which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransactionByIndex(uint256 index) external view returns (address transformer, SignedTx memory signedTx);
}
