// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ILocalEntrySC.sol";
import "./BytesUtils.sol";

string constant PERSONAL_SIGN_PREFIX = "\x19Ethereum Signed Message:\n";
string constant OMNIVERSE_AA_SC_PREFIX = "Register to AATransformer:";

contract LocalEntrySC is ILocalEntrySC {
    mapping(address => bytes[]) AASCMapToPubkeys;
    mapping(bytes => address) pubkeyMapToAASC;
    mapping(bytes32 => SignedTx) txidMapToSignedOmniverseTx;
    mapping(bytes32 => address) txidMapToTransformerSC;
    bytes32[] txidArray;

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
    error FailedToVerifySignature(bytes publicKey, bytes signature, address omniverseAASC);

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
            bytes memory rawData = abi.encodePacked(OMNIVERSE_AA_SC_PREFIX, "0x", BytesUtils.bytesToHexString(abi.encodePacked(msg.sender)));
            bytes32 hash = keccak256(abi.encodePacked(PERSONAL_SIGN_PREFIX, bytes(Strings.toString(rawData.length)), rawData));
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
    function getPubkeys(address transformer) external view returns (bytes[] memory pubkeys) {
        return AASCMapToPubkeys[transformer];
    }

    /**
     * @notice The AA-transformer submits signed tx to the local entry contract
     * @param signedTx Signed omniverse transaction
     */
    function submitTx(SignedTx calldata signedTx) external {
        if (AASCMapToPubkeys[msg.sender].length == 0) {
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

        txidMapToTransformerSC[signedTx.txid] = msg.sender;

        txidArray.push(signedTx.txid);
    }

    /**
     * @notice Returns transaction data of specified `txid`
     * @param txid The transaction id of which transaction to be queried
     * @return transformer The AA-transform which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransaction(bytes32 txid) public view returns (address transformer, SignedTx memory signedTx) {
        transformer = txidMapToTransformerSC[txid];
        signedTx = txidMapToSignedOmniverseTx[txid];
    }

    /**
     * @notice Returns transaction data of specified `index`
     * @param index The index of transaction to be queried, according to time sequence
     * @return transformer The AA-transform which transaction is sent from
     * @return signedTx The signed transction
     */
    function getTransactionByIndex(uint256 index) external view returns (address transformer, SignedTx memory signedTx) {
        bytes32 txid = txidArray[index];
        (transformer, signedTx)  = getTransaction(txid);
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

    /**
     * @notice Convert the public key to evm address
     */
    function pubKeyToAddress(bytes memory _pk) public pure returns (address) {
        bytes32 hash = keccak256(_pk);
        return address(uint160(uint256(hash)));
    }
}
