// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/ILocalEntrySC.sol";

string constant OMNIVERSE_AA_SC_PREFIX = "Register to AATransformer:";

abstract contract LocalEntrySC is ILocalEntrySC {
    mapping(address => bytes[]) AASCMapToPubkeys;
    mapping(bytes => address) pubkeyMapToAASC;

    /**
     * @notice Throws when length of public keys and signatures are not equal
     */
    error LengthOfPublickeysAndSignaturesNotEqual();

    /**
     * @notice Throws when it failed to verify signatures
     * @param publicKey The public key matching the signature
     * @param signature The signature which failed to verify
     * @param omniverseAASC The omniverse AA contract address
     */
    error FailedToVerifySignature(bytes memory publicKey, bytes memory signature, address omniverseAASC);

    /**
     * @notice Throws when any public key already registered
     * @param publicKey The public key which duplicated
     */
    error PublicKeyAlreadyRegistered(bytes memory publicKey);

    constructor() {

    }

    /**
     * @notice The AA-transformer registers pubkeys to local entry contract
     * @param pubkeys Public keys of AA transformer
     */
    function register(bytes[] calldata pubkeys, bytes[] calldata signatures) external {
        if (pubkeys.length != signatures.length) {
            revert LengthOfPublickeysAndSignaturesNotEqual();
        }

        for (uint i = 0; i < pubkeys.length; i++) {
            if (pubkeyMapToAASC[pubkeys[i]] != address(0)) {
                revert PublicKeyAlreadyRegistered(pubkeys[i]);
            }
        }

        // verify signatures
        for (uint i = 0; i < pubkeys.length; i++) {
            bytes32 hash = keccak256(abi.encodePacked(OMNIVERSE_AA_SC_PREFIX, msg.sender));
            address pkAddress = recoverAddress(hash, signatures[i]);
            address senderAddress = pubKeyToAddress(pubkeys[i]);
            if (pkAddress != senderAddress) {
                revert FailedToVerifySignature(pubkeys[i], signatures[i], msg.sender);
            }
            AASCMapToPubkeys[msg.sender].push(pubkeys[i]);
            pubkeyMapToAASC[pubkeys[i]] = msg.sender;
        }
    }

    /**
     * @notice Returns public keys of a specified AA-transformer
     * @param transformer The address of the AA-transformer
     * @return pubkeys Public keys of the AA-transformer
     */
    function getPubkeys(address transformer) external view returns (bytes memory pubkeys) {
        // pubkeys = 
    }

    /**
     * @notice The AA-transformer submits signed tx to the local entry contract
     * @param signedTx The encoded signed transaction data
     */
    function submitTx(bytes calldata signedTx) external;

    /**
     * @notice Returns transaction data of specified `txid`
     * @param txid The transaction id of which transaction to be queried
     * @return transformer The AA-transform which transaction is sent from
     * @return tx The signed transction
     */
    function getTransaction(bytes32 txid) external view returns (address transformer, SignedTx memory tx);

    /**
     * @notice Returns transaction data of specified `index`
     * @param index The index of transaction to be queried, according to time sequence
     * @return transformer The AA-transform which transaction is sent from
     * @return tx The signed transction
     */
    function getTransactionByIndex(uint256 index) external view returns (address transformer, SignedTx memory tx);

    /**
     * @notice Recover the address
     */
    function recoverAddress(bytes32 _hash, bytes memory _signature) internal pure returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := mload(add(_signature, 65))
        }
        address recovered = ecrecover(_hash, v, r, s);
        return recovered;
    }

    /**
     * @notice Convert the public key to evm address
     */
    function pubKeyToAddress(bytes memory _pk) internal pure returns (address) {
        bytes32 hash = keccak256(_pk);
        return address(uint160(uint256(hash)));
    }
}
