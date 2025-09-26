# Omniverse Library for Abstract Account

This repository provides contract base classes and deployment tools for developing dApps on the Omniverse network. It is intended to help developers who wish to deploy dApps on the Omniverse network quickly build Omniverse applications using the code in this repository.

## Install

Clone the repository and import the codes in your projects, or

```
npm install @omniverselab/aa-lib
```

## Usage

It is RECOMMENDED that your contract inherits from `OmniverseAABeacon` on Omniverse Beacon chain,  inherits from `OmniverseAALocal` on other chains. Such as

```
contract OmniverseTransformerBeacon is OmniverseAABeacon {
    // ...
}
```

You can refer to the code in this [repository](https://github.com/Omniverse-Web3-Labs/omniverse-transformer), which builds a contract to swap tokens between Omniverse tokens and ERC20.