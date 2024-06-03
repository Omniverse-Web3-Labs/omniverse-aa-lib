// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../OmniverseAABeacon.sol";

contract OmniverseAABeaconTest is OmniverseAABeacon {
    constructor(bytes memory uncompressedPublicKey, Types.UTXO[] memory utxos, address _poseidon, address _eip712) OmniverseAABeacon(uncompressedPublicKey, utxos, _poseidon, _eip712) {
        
    }

    function setLocalEntry(address _localEntry) public {
        sysConfig.localEntry = _localEntry;
    }

    function setStateKeeper(address _stateKeeper) public {
        sysConfig.stateKeeper = _stateKeeper;
    }
}
