import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MockIDRModule", (m) => {
  const admin = m.getAccount(0);
  const mockIdr = m.contract("MockIDR", [admin]);

  return { mockIdr };
});
