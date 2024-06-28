// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./OmniverseAABase.sol";

contract OmniverseAALocal is OmniverseAABase {
    constructor(Types.UTXO[] memory utxos, address _poseidon, address _eip712) OmniverseAABase(utxos, _poseidon, _eip712) {
    }
}
