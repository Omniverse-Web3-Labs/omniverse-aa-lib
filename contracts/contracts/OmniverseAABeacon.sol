// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./OmniverseAABase.sol";

contract OmniverseAABeacon is OmniverseAABase {
    /**
     * @notice Throws when transaction not exists in state keeper
     * @param txid The transaction id
     */
    error TransactionNotExistsInStateKeeper(bytes32 txid);

    constructor(bytes memory uncompressedPublicKey, Types.UTXO[] memory utxos, IPoseidon _poseidon) OmniverseAABase(uncompressedPublicKey, utxos, _poseidon) {
    }

    /**
     * @notice Handles an omniverse transaction sent from global exec server
     * @param omniTx The transaction data to be handled
     * @param merkleProof The merkle proof of omniverse transaction
     */
    function handleOmniverseTx(OmniverseTx calldata omniTx, bytes32[] calldata merkleProof) external {

    }
}
