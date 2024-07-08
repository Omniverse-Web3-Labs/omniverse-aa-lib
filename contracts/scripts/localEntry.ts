import hre, { ethers } from "hardhat";
import LocalEntryModule from "../ignition/modules/LocalEntry";
import saveDeployInfo from "./saveDeployInfo";


async function main() {
  const { localEntry } = await hre.ignition.deploy(LocalEntryModule);

  console.log(`LocalEntryModule deployed to: ${localEntry.target}`);
  
  await saveDeployInfo("localEntry", localEntry.target as string);
}

main().catch(console.error);