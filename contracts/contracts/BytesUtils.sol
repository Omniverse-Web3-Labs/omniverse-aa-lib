pragma solidity ^0.8.0;

library BytesUtils {
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
}