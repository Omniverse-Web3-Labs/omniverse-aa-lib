// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../OmniverseAABeacon.sol";

contract OmniverseAABeaconTest is OmniverseAABeacon {
    constructor(Types.UTXO[] memory utxos, address _poseidon, address _eip712) OmniverseAABeacon(utxos, _poseidon, _eip712) {
        
    }

    function setLocalEntry(address _localEntry) public {
        sysConfig.localEntry = _localEntry;
    }

    function setStateKeeper(address _stateKeeper) public {
        sysConfig.stateKeeper = _stateKeeper;
    }

    function onDeploy(bytes32 txid, address signer, Types.Deploy memory data, bytes memory customData) internal override {
        
    }

    function onMint(bytes32 txid, address signer, Types.Mint memory data, bytes memory customData) internal override {
        
    }

    function onTransfer(bytes32 txid, address signer, Types.Transfer memory data, bytes memory customData) internal override {
        
    }

    /**
     * @notice Handles an omniverse transaction sent from global exec server
     */
    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof, bytes calldata signerPubkey, bytes calldata customData) external{
        _handleOmniverseTx(omniTx, merkleProof, signerPubkey, customData);
    }
}
