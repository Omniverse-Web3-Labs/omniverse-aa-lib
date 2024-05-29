// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "../lib/Types.sol";

/**
 * @notice Interface to handle omniverse transaction
 */
interface IOmniverseTxHandler {
    /**
     * @notice Called when an omniverse transaction is Deploy
     * @param data Deploy data
     */
    function onDeploy(Types.Deploy memory data) external;

    /**
     * @notice Called when an omniverse transaction is Mint
     * @param data Mint data
     */
    function onMint(Types.Mint memory data) external;

    /**
     * @notice Called when an omniverse transaction is Transfer
     * @param data Transfer data
     */
    function onTransfer(Types.Transfer memory data) external;
}
