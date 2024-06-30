// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IOmniverseSysConfigAA.sol";

contract OmniverseSysConfig is IOmniverseSysConfigAA {
    // the fee token asset id
    bytes32 gasAssetId_;
    // the fee token receiver
    bytes32 gasRecipient_;
    // the amount pay for transaction
    uint128 gasFee_;
    // the maximum number of UTXOs allowed in a single transaction
    uint256 maxTxUTXO_;
    // decimals of Omniverse tokens
    uint8 decimals_;
    // the up limit of Omniverse token name
    uint8 tokenNameLimit_;
    // address of state keeper on the chain
    address stateKeeper_;
    // address of local entry contract
    address localEntry_;

    constructor(bytes32 _assetId, bytes32 _recipient, uint128 _fee, uint256 _maxUTXO, uint8 _decimals, uint8 _tokenNameLimit, address _stateKeeper, address _localEntry) {
        gasAssetId_ = _assetId;
        gasRecipient_ = _recipient;
        gasFee_ = _fee;
        maxTxUTXO_ = _maxUTXO;
        decimals_ = _decimals;
        tokenNameLimit_ = _tokenNameLimit;
        stateKeeper_ = _stateKeeper;
        localEntry_ = _localEntry;
    }

    /**
     * @notice Gas cost per Omniverse transaction
     */
    function gasFee() external view returns (uint128) {
        return gasFee_;
    }

    /**
     * @notice The Omniverse account which will receive gas fee
     */
    function gasRecipient() external view returns (bytes32) {
        return gasRecipient_;
    }

    /**
     * @notice The Omniverse gas token asset id
     */
    function gasAssetId() external view returns (bytes32) {
        return gasAssetId_;
    }

    /**
     * @notice The max UTXO number allowed in an Omniverse transaction, including alls inputs and outputs
     */
    function maxUTXONumber() external view returns (uint256) {
        return maxTxUTXO_;
    }

    /**
     * @notice Decimals of Omniverse assets
     */
    function decimals() external view returns (uint8) {
        return decimals_;
    }

    /**
     * @notice The up limit of Omniverse token name deployed
     */
    function tokenNameLimit() external view returns (uint8) {
        return tokenNameLimit_;
    }

    /**
     * @notice The global Omniverse state keeper which execute all Omniverse transactions and store Omniverse data on the chain
     */
    function stateKeeper() external view returns (address) {
        return stateKeeper_;
    }

    /**
     * @notice The local entry which is the entry for AA contracts on the chain accessing to Omniverse
     */
    function localEntry() external view returns (address) {
        return localEntry_;
    }
}
