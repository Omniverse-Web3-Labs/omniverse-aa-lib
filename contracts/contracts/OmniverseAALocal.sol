// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./OmniverseAABase.sol";

contract OmniverseAALocal is OmniverseAABase {
    constructor(bytes memory uncompressedPublicKey, Types.UTXO[] memory utxos, address _poseidon, address _eip712) OmniverseAABase(uncompressedPublicKey, utxos, _poseidon, _eip712) {
    }

    /**
     * @notice Handles an omniverse transaction sent from global exec server
     * See {IOmniverseAA.sol - handleOmniverseTx}
     */
    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof, bytes calldata signerPubkey, bytes calldata customData) external override {
        
    }
}
