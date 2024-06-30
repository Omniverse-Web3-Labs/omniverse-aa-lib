// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./IOmniverseSysConfig.sol";

/**
 * @notice Interface of Omniverse system config
 */
interface IOmniverseSysConfigAA is IOmniverseSysConfig {
    /**
     * @notice The global Omniverse state keeper which execute all Omniverse transactions and store Omniverse data on the chain
     */
    function stateKeeper() external view returns (address);

    /**
     * @notice The local entry which is the entry for AA contracts on the chain accessing to Omniverse
     */
    function localEntry() external view returns (address);
}
