// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import 'hardhat/console.sol';
import '../lib/Types.sol';

interface IOmniverseEIP712 {
    function verifySignature(
        Types.TxType txType,
        bytes calldata txData,
        bytes calldata signer
    ) external view returns (address);
}