import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OmniverseEIP712Module = buildModule("OmniverseEIP712Module", (m) => {
  const name = m.getParameter("name");
  const version = m.getParameter("version");
  const chainId = m.getParameter("chainId");
  const verifyContract = m.getParameter("verifyContract");
  
  const eip712 = m.contract("OmniverseEIP712", [name, version, chainId, verifyContract]);

  return { eip712 };
});

export default OmniverseEIP712Module;
