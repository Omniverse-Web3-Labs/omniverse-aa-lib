import hre, { ethers } from "hardhat";
import SysConfigAA from "../ignition/modules/SysConfigAA";
import saveDeployInfo from "./saveDeployInfo";
import fs from "fs";

const PARAMETER_FILE = "./scripts/parameters.json";

async function main() {
  const parameters = JSON.parse(fs.readFileSync(PARAMETER_FILE).toString())['sysConfigAA'];

  const { sysConfigAA } = await hre.ignition.deploy(SysConfigAA, {
    parameters: {
      OmniverseSysConfigAAModule: {
        gasAssetId: parameters.gasAssetId,
        gasRecipient: parameters.gasRecipient,
        gasFee: parameters.gasFee,
        maxTxUTXO: parameters.maxTxUTXO,
        decimals: parameters.decimals,
        tokenNameLimit: parameters.tokenNameLimit,
        stateKeeper: parameters.stateKeeper,
        localEntry: parameters.localEntry
      }
    }
  });

  console.log(`SysConfigAA deployed to: ${sysConfigAA.target}`);
  
  await saveDeployInfo("sysConfigAA", sysConfigAA.target as string);
}

main().catch(console.error);