import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LocalEntryModule = buildModule("LocalEntryModule", (m) => {
  const eip712 = m.getParameter("eip712");
  const poseidon = m.getParameter("poseidon");

  const localEntry = m.contract("LocalEntry", [eip712, poseidon]);

  return { localEntry };
});

export default LocalEntryModule;
