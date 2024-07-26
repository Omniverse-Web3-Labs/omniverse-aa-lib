// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../interfaces/IStateKeeperBeacon.sol";

contract MockStateKeeperBeacon is IStateKeeperBeacon {
    bool isIncluded;
    constructor() {
        
    }

    function setIsIncluded(bool _included) external {
        isIncluded = _included;
    }

    function containsTxID(bytes32 txid) external view returns (bool) {
        return isIncluded;
    }
}
