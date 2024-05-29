// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import 'hardhat/console.sol';
import './Types.sol';

interface IPoseidon {
    function hashNToMNoPad(
        uint256[] memory input,
        uint256 numOutputs
    ) external view returns (uint256[] memory output);
}

interface IOmniverseBeacon {
    function balanceOf(
        bytes32 assetId,
        address account
    ) external view returns (uint256);
}

interface IOmniverseTokenFactory {
    function createOmniverseToken(
        bytes32 assetId,
        IOmniverseBeacon beacon
    ) external returns (address);
}

library Utils {
    using Types for *;

    function bytesToHexString(bytes memory data) internal pure returns (string memory) {
        bytes memory hexString = new bytes(2 * data.length);

        for (uint256 i = 0; i < data.length; i++) {
            uint8 byteValue = uint8(data[i]);
            bytes memory hexChars = "0123456789abcdef";
            hexString[2 * i] = hexChars[byteValue >> 4];
            hexString[2 * i + 1] = hexChars[byteValue & 0x0f];
        }

        return string(hexString);
    }

    /**
     * @notice Convert the public key to evm address
     */
    function pubKeyToAddress(bytes memory _pk) internal pure returns (address) {
        bytes32 hash = keccak256(_pk);
        return address(uint160(uint256(hash)));
    }

    function uint256ToLittleEndianBytes(
        uint256 value
    ) internal pure returns (bytes memory) {
        bytes memory result = new bytes(32);
        for (uint i = 0; i < 32; i++) {
            result[i] = bytes1(uint8(value >> (i * 8)));
        }
        return result;
    }

    function uint128ToLittleEndianBytes(
        uint128 value
    ) internal pure returns (bytes memory) {
        bytes memory result = new bytes(16);
        assembly {
            let ptr := add(result, 32) // skip the length part of the bytes array
            mstore(ptr, value) // store the 128-bit value

            // Convert to little endian
            let temp := mload(ptr)
            let littleEndian := or(
                or(
                    or(
                        shl(248, and(temp, 0xFF)),
                        shl(240, and(shr(8, temp), 0xFF))
                    ),
                    or(
                        shl(232, and(shr(16, temp), 0xFF)),
                        shl(224, and(shr(24, temp), 0xFF))
                    )
                ),
                or(
                    or(
                        shl(216, and(shr(32, temp), 0xFF)),
                        shl(208, and(shr(40, temp), 0xFF))
                    ),
                    or(
                        shl(200, and(shr(48, temp), 0xFF)),
                        shl(192, and(shr(56, temp), 0xFF))
                    )
                )
            )

            littleEndian := or(
                littleEndian,
                or(
                    or(
                        or(
                            shl(184, and(shr(64, temp), 0xFF)),
                            shl(176, and(shr(72, temp), 0xFF))
                        ),
                        or(
                            shl(168, and(shr(80, temp), 0xFF)),
                            shl(160, and(shr(88, temp), 0xFF))
                        )
                    ),
                    or(
                        or(
                            shl(152, and(shr(96, temp), 0xFF)),
                            shl(144, and(shr(104, temp), 0xFF))
                        ),
                        or(
                            shl(136, and(shr(112, temp), 0xFF)),
                            shl(128, and(shr(120, temp), 0xFF))
                        )
                    )
                )
            )

            mstore(ptr, littleEndian) // store the little endian value back
        }

        return result;
    }

    function bytesToField64Array(
        bytes memory data
    ) internal pure returns (uint256[] memory) {
        uint numChunks = data.length / 8;
        uint remainBytesLen = data.length % 8;
        uint256[] memory result = remainBytesLen > 0
            ? new uint256[](numChunks + 1)
            : new uint256[](numChunks);
        for (uint i = 0; i < numChunks; ++i) {
            bytes memory chunk = new bytes(8);
            for (uint j; j < 8; ++j) {
                chunk[8 - 1 - j] = bytes1(data[i * 8 + j]);
            }
            result[i] = uint256(bytes32(chunk)) >> 192;
        }
        if (remainBytesLen > 0) {
            bytes memory chunk = new bytes(8);
            for (uint j; j < remainBytesLen; ++j) {
                chunk[8 - 1 - j] = bytes1(data[numChunks * 8 + j]);
            }
            result[numChunks] = uint256(bytes32(chunk)) >> 192;
        }
        return result;
    }

    /**
     * @notice Calculate asset id
     * @param value convert uint256 to bytes8 only use in calAssetId
     */
    function uintToBytes8Reverse(
        uint value
    ) internal pure returns (bytes memory b) {
        bytes memory result = new bytes(8);

        assembly {
            let ptr := add(result, 32) // skip the length part of the bytes array
            mstore(ptr, value) // store the 128-bit value

            // Convert to little endian
            let temp := mload(ptr)
            let littleEndian := or(
                or(
                    or(
                        shl(248, and(temp, 0xFF)),
                        shl(240, and(shr(8, temp), 0xFF))
                    ),
                    or(
                        shl(232, and(shr(16, temp), 0xFF)),
                        shl(224, and(shr(24, temp), 0xFF))
                    )
                ),
                or (
                    or(
                        shl(216, and(shr(32, temp), 0xFF)),
                        shl(208, and(shr(40, temp), 0xFF))
                    ),
                    or(
                        shl(200, and(shr(48, temp), 0xFF)),
                        shl(192, and(shr(56, temp), 0xFF))
                    )
                )
            )

            mstore(ptr, littleEndian) // store the little endian value back
        }

        return result;
    }

    function deployToBytes(
        Types.Deploy memory deploy
    ) internal pure returns (bytes memory) {
        bytes memory originalNameBytes = bytes(deploy.metadata.name);
        bytes memory nameBytes = new bytes(Types.TOKEN_NAME_LEN);
        for (uint i; i < originalNameBytes.length; ++i) {
            nameBytes[i] = originalNameBytes[i];
        }
        return
            abi.encodePacked(
                deploy.metadata.salt,
                nameBytes,
                deploy.metadata.deployer,
                uint128ToLittleEndianBytes(deploy.metadata.totalSupply),
                uint128ToLittleEndianBytes(deploy.metadata.limit),
                uint128ToLittleEndianBytes(deploy.metadata.price),
                inputToBytes(deploy.feeInputs),
                outputToBytes(deploy.feeOutputs)
            );
    }

    function MintToBytes(
        Types.Mint memory mint
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                mint.assetId,
                outputToBytes(mint.outputs),
                inputToBytes(mint.feeInputs),
                outputToBytes(mint.feeOutputs)
            );
    }

    function TransferToBytes(
        Types.Transfer memory transfer
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                transfer.assetId,
                inputToBytes(transfer.inputs),
                outputToBytes(transfer.outputs),
                inputToBytes(transfer.feeInputs),
                outputToBytes(transfer.feeOutputs)
            );
    }

    function inputToBytes(
        Types.Input[] memory inputs
    ) internal pure returns (bytes memory result) {
        for (uint i; i < inputs.length; ++i) {
            result = abi.encodePacked(
                result,
                inputs[i].txid,
                uintToBytes8Reverse(inputs[i].index),
                inputs[i].omniAddress,
                uint128ToLittleEndianBytes(inputs[i].amount)
            );
        }
    }

    function outputToBytes(
        Types.Output[] memory outputs
    ) internal pure returns (bytes memory result) {
        for (uint i; i < outputs.length; ++i) {
            result = abi.encodePacked(
                result,
                outputs[i].omniAddress,
                uint128ToLittleEndianBytes(outputs[i].amount)
            );
        }
    }

    function calTxId(
        bytes memory txData,
        IPoseidon poseidon
    ) internal view returns (bytes32) {
        uint256[] memory inputs = Utils.bytesToField64Array(txData);
        uint256[] memory txHashOutputs = poseidon.hashNToMNoPad(inputs, 4);
        return
            bytes32(
                abi.encodePacked(
                    uintToBytes8Reverse(txHashOutputs[0]),
                    uintToBytes8Reverse(txHashOutputs[1]),
                    uintToBytes8Reverse(txHashOutputs[2]),
                    uintToBytes8Reverse(txHashOutputs[3])
                )
            );
    }

    /**
     * @notice Calculate asset id
     * @param salt Randomly generated bytes
     * @param originalNameBytes The bytes of asset name
     * @param deployer The deplpyer of the asset
     */
    function calAssetId(
        bytes8 salt,
        bytes memory originalNameBytes,
        bytes32 deployer,
        IPoseidon poseidon
    ) internal view returns (bytes32) {
        bytes memory nameBytes = new bytes(Types.TOKEN_NAME_LEN);
        for (uint i; i < originalNameBytes.length; ++i) {
            nameBytes[i] = originalNameBytes[i];
        }
        // console.logBytes24(bytes24(nameBytes));
        bytes memory data = abi.encodePacked(salt, nameBytes, deployer);
        uint numChunks = data.length / Types.Chunk_Size;
        uint256[] memory inputs = new uint256[](numChunks);
        for (uint i = 0; i < numChunks; ++i) {
            bytes memory chunk = new bytes(Types.Chunk_Size);
            for (uint j; j < Types.Chunk_Size; ++j) {
                chunk[Types.Chunk_Size - 1 - j] = bytes1(
                    data[i * Types.Chunk_Size + j]
                );
            }
            inputs[i] = uint256(bytes32(chunk)) >> 192;
        }
        uint256[] memory hashOutputs = poseidon.hashNToMNoPad(inputs, 4);
        return
            bytes32(
                abi.encodePacked(
                    uintToBytes8Reverse(hashOutputs[0]),
                    uintToBytes8Reverse(hashOutputs[1]),
                    uintToBytes8Reverse(hashOutputs[2]),
                    uintToBytes8Reverse(hashOutputs[3])
                )
            );
    }
}
