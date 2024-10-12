import hre, { ethers } from "hardhat";
import OmniverseEIP712 from "../ignition/modules/OmniverseEIP712";
import saveDeployInfo from "./saveDeployInfo";
import fs from "fs";
import { waitForConfirmations } from "./utils";

const PARAMETER_FILE = "./scripts/parameters.json";

async function main() {
  const parameters = JSON.parse(fs.readFileSync(PARAMETER_FILE).toString())['eip712AA'];

  const { eip712 } = await hre.ignition.deploy(OmniverseEIP712, {
    parameters: {
      OmniverseEIP712Module: {
        name: parameters.name,
        version: parameters.version,
        chainId: parseInt(parameters.chainId),
        verifyContract: parameters.verifyContract
      }
    }
  });

  console.log(`OmniverseEIP712 deployed to: ${eip712.target}`);
  
  await saveDeployInfo("eip712AA", eip712.target as string);
}

main().catch(console.error);