import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";

const sk = fs.readFileSync(".secret").toString();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    live: {
      url: `http://127.0.0.1:8545`,
      accounts: [sk]
    },
    develop: {
      url: `http://3.236.195.117:8998`,
      accounts: [sk]
    }
  }
};

export default config;
