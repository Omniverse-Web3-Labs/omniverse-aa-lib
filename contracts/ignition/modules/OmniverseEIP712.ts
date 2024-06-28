import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OmniverseEIP712Module = buildModule("OmniverseEIP712Module", (m) => {
  const eip712 = m.contract("OmniverseEIP712", ['Omniverse Transaction', '1', 1337, '0x27f9CE456486380d26f9F80e9b3A84d2eF4c9008']);

  return { eip712 };
});

export default OmniverseEIP712Module;
