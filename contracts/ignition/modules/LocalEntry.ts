import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LocalEntryModule = buildModule("LocalEntryModule", (m) => {
  const localEntry = m.contract("LocalEntry", []);

  return { localEntry };
});

export default LocalEntryModule;
