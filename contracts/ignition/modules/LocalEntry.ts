import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const JAN_1ST_2030 = 1893456000;
const ONE_GWEI: bigint = 1_000_000_000n;

const LocalEntryModule = buildModule("LocalEntryModule", (m) => {
  const localEntry = m.contract("LocalEntry", []);

  return { localEntry };
});

export default LocalEntryModule;
