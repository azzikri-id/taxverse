import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploy MockIDR + TaxVerse sekaligus.
 * Akun deployer menjadi admin MockIDR, admin + petugas TaxVerse, sekaligus kas awal
 * (kas bisa diganti nanti lewat `setKas`).
 */
export default buildModule("TaxVerseModule", (m) => {
  const deployer = m.getAccount(0);

  const mockIdr = m.contract("MockIDR", [deployer]);
  const taxverse = m.contract("TaxVerse", [deployer, mockIdr, deployer]);

  return { mockIdr, taxverse };
});
