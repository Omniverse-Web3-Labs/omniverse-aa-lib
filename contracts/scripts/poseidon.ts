import hre, { ethers } from "hardhat";
import PoseidonModule from "../ignition/modules/Poseidon";
import saveDeployInfo from "./saveDeployInfo";


async function main() {
  const { poseison } = await hre.ignition.deploy(PoseidonModule);

  console.log(`PoseidonModule deployed to: ${poseison.target}`);
  
  await saveDeployInfo("poseidon", poseison.target as string);
}

main().catch(console.error);