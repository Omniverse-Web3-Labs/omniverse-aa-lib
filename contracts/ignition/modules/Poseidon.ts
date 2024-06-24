import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PoseidonModule = buildModule("PoseidonModule", (m) => {
  const poseison = m.contract("Poseidon", []);

  return { poseison };
});

export default PoseidonModule;
