import hre, { ethers } from "hardhat";
import LocalEntryModule from "../ignition/modules/LocalEntry";
import saveDeployInfo from "./saveDeployInfo";
import fs from "fs";

const PARAMETER_FILE = "./scripts/parameters.json";

async function main() {
  const parameters = JSON.parse(fs.readFileSync(PARAMETER_FILE).toString())['localEntry'];

  const { localEntry } = await hre.ignition.deploy(LocalEntryModule, {
    parameters: {
      LocalEntryModule: {
        eip712: parameters.eip712,
        poseidon: parameters.poseidon,
      }
    }
  });

  console.log(`LocalEntryModule deployed to: ${localEntry.target}`);
  
  await saveDeployInfo("localEntry", localEntry.target as string);
}

main().catch(console.error);