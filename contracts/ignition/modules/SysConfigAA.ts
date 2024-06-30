import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OmniverseSysConfigAAModule = buildModule("OmniverseSysConfigAAModule", (m) => {
  const gasAssetId = m.getParameter("gasAssetId");
  const gasRecipient = m.getParameter("gasRecipient");
  const gasFee = m.getParameter("gasFee");
  const maxTxUTXO = m.getParameter("maxTxUTXO");
  const decimals = m.getParameter("decimals");
  const tokenNameLimit = m.getParameter("tokenNameLimit");
  const stateKeeper = m.getParameter("stateKeeper");
  const localEntry = m.getParameter("localEntry");
  
  const sysConfigAA = m.contract("OmniverseSysConfigAA", [
    gasAssetId,
    gasRecipient,
    gasFee,
    maxTxUTXO,
    decimals,
    tokenNameLimit,
    stateKeeper,
    localEntry,
  ]);

  return { sysConfigAA };
});

export default OmniverseSysConfigAAModule;
