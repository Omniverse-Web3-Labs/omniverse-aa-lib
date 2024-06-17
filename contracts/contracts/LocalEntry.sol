// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ILocalEntry.sol";
import "./lib/Utils.sol";

string constant PERSONAL_SIGN_PREFIX = "\x19Ethereum Signed Message:\n";
string constant OMNIVERSE_AA_SC_PREFIX = "Register to Omniverse AA: ";

contract LocalEntry is ILocalEntry {
    mapping(address => bytes[]) omniverseAAMapToPubkeys;
    mapping(bytes => address) pubkeyMapToOmniverseAA;
    mapping(bytes32 => SignedTx) txidMapToSignedOmniverseTx;
    mapping(bytes32 => address) txidMapToOmniverseAA;
    bytes32[] txidArray;

    /**
     * @notice Throws when length of public keys and signatures are not equal
     */
    error LengthOfPublickeysAndSignaturesNotEqual();

    /**
     * @notice Throws when it failed to verify signatures
     * @param publicKey The public key matching the signature
     * @param signature The signature which failed to verify
     * @param omniverseAA The omniverse AA contract address
     */
    error FailedToVerifySignature(bytes publicKey, bytes signature, address omniverseAA);

    /**
     * @notice Throws when any public key already registered
     * @param publicKey The public key which duplicated
     */
    error PublicKeyAlreadyRegistered(bytes publicKey);

    /**
     * @notice Throws when sender is registred
     * @param sender The sender which submits transaction to local entry
     */
    error SenderNotRegistered(address sender);

    /**
     * @notice Throws when transaction with the same txid exists
     * @param txid The id of submitted transaction
     */
    error TransactionExists(bytes32 txid);

    /**
     * @notice Throws when signature is empty
     * @param txid The id of submitted transaction
     */
    error SignatureEmpty(bytes32 txid);

    constructor() {

    }

    /**
     * @notice The AA contract registers pubkeys to local entry contract
     * @param pubkeys Public keys of AA contract
     */
    function register(bytes[] calldata pubkeys, bytes[] calldata signatures) external {
        if (pubkeys.length != signatures.length) {
            revert LengthOfPublickeysAndSignaturesNotEqual();
        }

        for (uint i = 0; i < pubkeys.length; i++) {
            if (pubkeyMapToOmniverseAA[pubkeys[i]] != address(0)) {
                revert PublicKeyAlreadyRegistered(pubkeys[i]);
            }
        }

        // verify signatures
        bytes memory rawData = abi.encodePacked(OMNIVERSE_AA_SC_PREFIX, "0x", Utils.bytesToHexString(abi.encodePacked(msg.sender)), ", chain id: ", Strings.toString(block.chainid));
        for (uint i = 0; i < pubkeys.length; i++) {
            bytes32 hash = keccak256(abi.encodePacked(PERSONAL_SIGN_PREFIX, bytes(Strings.toString(rawData.length)), rawData));
            address pkAddress = recoverAddress(hash, signatures[i]);
            address senderAddress = Utils.pubKeyToAddress(pubkeys[i]);
            if (pkAddress != senderAddress) {
                revert FailedToVerifySignature(pubkeys[i], signatures[i], msg.sender);
            }
            omniverseAAMapToPubkeys[msg.sender].push(pubkeys[i]);
            pubkeyMapToOmniverseAA[pubkeys[i]] = msg.sender;
        }
    }

    /**
     * @notice Returns public keys of a specified AA contract
     * @param omniverseAA The address of the AA contract
     * @return pubkeys Public keys of the AA contract
     */
    function getPubkeys(address omniverseAA) external view returns (bytes[] memory pubkeys) {
        return omniverseAAMapToPubkeys[omniverseAA];
    }

    /**
     * @notice The AA Contract submits signed tx to the local entry contract
     * @param signedTx Signed omniverse transaction
     */
    function submitTx(SignedTx calldata signedTx) external {
        if (omniverseAAMapToPubkeys[msg.sender].length == 0) {
            revert SenderNotRegistered(msg.sender);
        }

        if (keccak256(signedTx.signature) == keccak256(bytes(""))) {
            revert SignatureEmpty(signedTx.txid);
        }

        if (txidMapToSignedOmniverseTx[signedTx.txid].txid != bytes32(0)) {
            revert TransactionExists(signedTx.txid);
        }

        SignedTx storage stx = txidMapToSignedOmniverseTx[signedTx.txid];
        stx.txid = signedTx.txid;
        stx.txType = signedTx.txType;
        stx.txData = signedTx.txData;
        stx.signature = signedTx.signature;

        txidMapToOmniverseAA[signedTx.txid] = msg.sender;

        txidArray.push(signedTx.txid);
    }

    /**
     * @notice Returns transaction data of specified `txid`
     * @param txid The transaction id of which transaction to be queried
     * @return omniverseAA The Omniverse AA contract which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransaction(bytes32 txid) public view returns (address omniverseAA, SignedTx memory signedTx) {
        omniverseAA = txidMapToOmniverseAA[txid];
        signedTx = txidMapToSignedOmniverseTx[txid];
    }

    /**
     * @notice Returns transaction data of specified `index`
     * @param index The index of transaction to be queried, according to time sequence
     * @return omniverseAA The Omniverse AA contract which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransactionByIndex(uint256 index) external view returns (address omniverseAA, SignedTx memory signedTx) {
        bytes32 txid = txidArray[index];
        (omniverseAA, signedTx)  = getTransaction(txid);
    }

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
}
