/**
 * Isi blockchain LOKAL dengan data contoh supaya bisa langsung dicoba.
 *
 * Pemakaian (blockchain lokal harus sudah jalan dan kontrak sudah di-deploy):
 *   npm run node            # terminal 1
 *   npm run deploy:local    # terminal 2
 *   npm run seed:local      # terminal 2
 *
 * Opsional: set DEV_WALLET=0x... supaya wallet MetaMask-mu diberi ETH lokal, mIDR,
 * role petugas, dan menjadi pemilik kendaraan contoh.
 */
import { readFile } from "node:fs/promises";
import { network } from "hardhat";
import { getAddress, isAddress, keccak256, parseEther, toHex, type Address } from "viem";

const HARI = 24n * 60n * 60n;
const TARIF = 2_500_000n;

/** Normalisasi nomor plat: huruf besar, tanpa spasi. "b 1234 xyz" -> "B1234XYZ". */
function vehicleId(plat: string) {
  return keccak256(toHex(plat.toUpperCase().replace(/\s+/g, "")));
}

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [admin] = await viem.getWalletClients();
const chainId = await publicClient.getChainId();

if (chainId !== 31337) {
  throw new Error(`Script ini hanya untuk blockchain lokal (chainId 31337), bukan ${chainId}.`);
}

const deployed = JSON.parse(
  await readFile(new URL(`../ignition/deployments/chain-${chainId}/deployed_addresses.json`, import.meta.url), "utf8"),
) as Record<string, Address>;

const mockIdr = await viem.getContractAt("MockIDR", deployed["TaxVerseModule#MockIDR"]);
const taxverse = await viem.getContractAt("TaxVerse", deployed["TaxVerseModule#TaxVerse"]);

const devWallet = process.env.DEV_WALLET;
if (devWallet && !isAddress(devWallet)) throw new Error(`DEV_WALLET bukan alamat valid: ${devWallet}`);
const pemilik: Address = devWallet ? getAddress(devWallet) : admin.account.address;

if (devWallet) {
  await admin.sendTransaction({ to: pemilik, value: parseEther("100") });
  await mockIdr.write.mint([pemilik, 50_000_000n]);
  await taxverse.write.grantRole([await taxverse.read.PETUGAS_ROLE(), pemilik]);
  console.log(`Wallet ${pemilik}: +100 ETH lokal, +Rp50.000.000 mIDR, role petugas`);
}

const sekarang = (await publicClient.getBlock()).timestamp;
const contoh = [
  { plat: "B 1234 XYZ", berlakuSampai: sekarang + 300n * HARI }, // AKTIF
  { plat: "D 5678 ABC", berlakuSampai: sekarang + 10n * HARI }, // JATUH_TEMPO
  { plat: "AB 9012 CD", berlakuSampai: sekarang - 75n * HARI }, // TERLAMBAT 3 bulan
];

const NAMA_STATUS = ["TIDAK_TERDAFTAR", "AKTIF", "JATUH_TEMPO", "TERLAMBAT"];

for (const { plat, berlakuSampai } of contoh) {
  const id = vehicleId(plat);
  if ((await taxverse.read.statusPajak([id])) === 0) {
    const hashData = keccak256(toHex(JSON.stringify({ plat, contoh: true })));
    await taxverse.write.daftarKendaraan([id, pemilik, hashData, TARIF, berlakuSampai]);
  }
}

console.log(`\nMockIDR  : ${mockIdr.address}`);
console.log(`TaxVerse : ${taxverse.address}\n`);
console.table(
  await Promise.all(
    contoh.map(async ({ plat }) => {
      const id = vehicleId(plat);
      const [pokok, denda, total] = await taxverse.read.hitungTagihan([id]);
      return {
        plat,
        status: NAMA_STATUS[await taxverse.read.statusPajak([id])],
        pokok: Number(pokok),
        denda: Number(denda),
        total: Number(total),
      };
    }),
  ),
);
