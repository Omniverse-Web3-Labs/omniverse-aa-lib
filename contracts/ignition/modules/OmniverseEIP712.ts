import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OmniverseEIP712Module = buildModule("OmniverseEIP712Module", (m) => {
  const eip712 = m.contract("OmniverseEIP712", ['Omniverse Transaction', '1', 1, '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC']);

  return { eip712 };
});

export default OmniverseEIP712Module;
