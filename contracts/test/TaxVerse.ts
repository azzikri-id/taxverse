import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, toHex, zeroAddress } from "viem";

describe("TaxVerse", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin, petugas, warga, kas, keluarga] = await viem.getWalletClients();

  const PETUGAS_ROLE = keccak256(toHex("PETUGAS_ROLE"));
  const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Data contoh kendaraan
  const PLAT = keccak256(toHex("B1234XYZ"));
  const HASH_PEMILIK = keccak256(toHex('{"nama":"Budi","nik":"3171xxxxxxxxxxxx"}'));
  const TARIF = 2_500_000n; // Rp2.500.000 per tahun
  const SATU_TAHUN = 365n * 24n * 60n * 60n;

  async function sekarang() {
    return (await publicClient.getBlock()).timestamp;
  }

  async function deployDenganPetugas() {
    const hasil = await deploy();
    await hasil.taxverse.write.grantRole([PETUGAS_ROLE, petugas.account.address]);
    return hasil;
  }

  async function daftarContoh(taxverse: Awaited<ReturnType<typeof deploy>>["taxverse"]) {
    const berlakuSampai = (await sekarang()) + SATU_TAHUN;
    await taxverse.write.daftarKendaraan([PLAT, warga.account.address, HASH_PEMILIK, TARIF, berlakuSampai], {
      account: petugas.account,
    });
    return berlakuSampai;
  }

  async function deploy() {
    const token = await viem.deployContract("MockIDR", [admin.account.address]);
    const taxverse = await viem.deployContract("TaxVerse", [
      admin.account.address,
      token.address,
      kas.account.address,
    ]);
    return { token, taxverse };
  }

  describe("deploy", function () {
    it("admin mendapat role admin dan petugas", async function () {
      const { taxverse } = await deploy();
      assert.equal(await taxverse.read.hasRole([ADMIN_ROLE, admin.account.address]), true);
      assert.equal(await taxverse.read.hasRole([PETUGAS_ROLE, admin.account.address]), true);
      assert.equal(await taxverse.read.PETUGAS_ROLE(), PETUGAS_ROLE);
    });

    it("menyimpan alamat token dan kas", async function () {
      const { token, taxverse } = await deploy();
      assert.equal(await taxverse.read.token(), getAddress(token.address));
      assert.equal(await taxverse.read.kas(), getAddress(kas.account.address));
    });

    it("menolak alamat nol", async function () {
      const { token, taxverse } = await deploy();
      await viem.assertions.revertWithCustomError(
        viem.deployContract("TaxVerse", [zeroAddress, token.address, kas.account.address]),
        taxverse,
        "AlamatNol",
      );
      await viem.assertions.revertWithCustomError(
        viem.deployContract("TaxVerse", [admin.account.address, token.address, zeroAddress]),
        taxverse,
        "AlamatNol",
      );
    });
  });

  describe("role petugas", function () {
    it("admin bisa memberi dan mencabut role petugas", async function () {
      const { taxverse } = await deploy();

      await taxverse.write.grantRole([PETUGAS_ROLE, petugas.account.address]);
      assert.equal(await taxverse.read.hasRole([PETUGAS_ROLE, petugas.account.address]), true);

      await taxverse.write.revokeRole([PETUGAS_ROLE, petugas.account.address]);
      assert.equal(await taxverse.read.hasRole([PETUGAS_ROLE, petugas.account.address]), false);
    });

    it("warga biasa tidak bisa memberi role petugas", async function () {
      const { taxverse } = await deploy();
      await viem.assertions.revertWithCustomError(
        taxverse.write.grantRole([PETUGAS_ROLE, warga.account.address], { account: warga.account }),
        taxverse,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("petugas tidak bisa memberi role petugas ke orang lain", async function () {
      const { taxverse } = await deploy();
      await taxverse.write.grantRole([PETUGAS_ROLE, petugas.account.address]);
      await viem.assertions.revertWithCustomError(
        taxverse.write.grantRole([PETUGAS_ROLE, warga.account.address], { account: petugas.account }),
        taxverse,
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("kas", function () {
    it("admin bisa mengganti kas dan event tercatat", async function () {
      const { taxverse } = await deploy();
      await viem.assertions.emitWithArgs(
        taxverse.write.setKas([warga.account.address]),
        taxverse,
        "KasDiubah",
        [getAddress(kas.account.address), getAddress(warga.account.address)],
      );
      assert.equal(await taxverse.read.kas(), getAddress(warga.account.address));
    });

    it("selain admin tidak bisa mengganti kas", async function () {
      const { taxverse } = await deploy();
      await viem.assertions.revertWithCustomError(
        taxverse.write.setKas([warga.account.address], { account: warga.account }),
        taxverse,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("kas tidak boleh alamat nol", async function () {
      const { taxverse } = await deploy();
      await viem.assertions.revertWithCustomError(taxverse.write.setKas([zeroAddress]), taxverse, "AlamatNol");
    });
  });

  describe("daftar kendaraan", function () {
    it("petugas bisa mendaftarkan kendaraan dan datanya tersimpan", async function () {
      const { taxverse } = await deployDenganPetugas();
      const berlakuSampai = await daftarContoh(taxverse);

      const k = await taxverse.read.getKendaraan([PLAT]);
      assert.equal(k.pemilik, getAddress(warga.account.address));
      assert.equal(k.hashDataPemilik, HASH_PEMILIK);
      assert.equal(k.tarifTahunan, TARIF);
      assert.equal(k.berlakuSampai, berlakuSampai);
      assert.equal(k.aktif, true);
      assert.equal(k.terdaftarPada, await sekarang());
    });

    it("memancarkan event KendaraanDidaftarkan", async function () {
      const { taxverse } = await deployDenganPetugas();
      const berlakuSampai = (await sekarang()) + SATU_TAHUN;
      await viem.assertions.emitWithArgs(
        taxverse.write.daftarKendaraan([PLAT, warga.account.address, HASH_PEMILIK, TARIF, berlakuSampai], {
          account: petugas.account,
        }),
        taxverse,
        "KendaraanDidaftarkan",
        [PLAT, getAddress(warga.account.address), TARIF],
      );
    });

    it("warga biasa tidak bisa mendaftarkan kendaraan", async function () {
      const { taxverse } = await deploy();
      await viem.assertions.revertWithCustomError(
        taxverse.write.daftarKendaraan([PLAT, warga.account.address, HASH_PEMILIK, TARIF, 1n], {
          account: warga.account,
        }),
        taxverse,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("kendaraan yang sama tidak bisa didaftarkan dua kali", async function () {
      const { taxverse } = await deployDenganPetugas();
      await daftarContoh(taxverse);
      await viem.assertions.revertWithCustomErrorWithArgs(
        taxverse.write.daftarKendaraan([PLAT, warga.account.address, HASH_PEMILIK, TARIF, 1n], {
          account: petugas.account,
        }),
        taxverse,
        "KendaraanSudahTerdaftar",
        [PLAT],
      );
    });

    it("menolak input kosong", async function () {
      const { taxverse } = await deployDenganPetugas();
      const zeroHash = `0x${"0".repeat(64)}` as const;
      const daftar = (args: Parameters<typeof taxverse.write.daftarKendaraan>[0]) =>
        taxverse.write.daftarKendaraan(args, { account: petugas.account });

      await viem.assertions.revertWithCustomError(
        daftar([zeroHash, warga.account.address, HASH_PEMILIK, TARIF, 1n]),
        taxverse,
        "VehicleIdKosong",
      );
      await viem.assertions.revertWithCustomError(
        daftar([PLAT, zeroAddress, HASH_PEMILIK, TARIF, 1n]),
        taxverse,
        "AlamatNol",
      );
      await viem.assertions.revertWithCustomError(
        daftar([PLAT, warga.account.address, zeroHash, TARIF, 1n]),
        taxverse,
        "HashKosong",
      );
      await viem.assertions.revertWithCustomError(
        daftar([PLAT, warga.account.address, HASH_PEMILIK, 0n, 1n]),
        taxverse,
        "TarifNol",
      );
      await viem.assertions.revertWithCustomError(
        daftar([PLAT, warga.account.address, HASH_PEMILIK, TARIF, 0n]),
        taxverse,
        "MasaBerlakuKosong",
      );
    });
  });

  describe("ubah tarif", function () {
    it("petugas bisa mengubah tarif dan event tercatat", async function () {
      const { taxverse } = await deployDenganPetugas();
      await daftarContoh(taxverse);

      await viem.assertions.emitWithArgs(
        taxverse.write.ubahTarif([PLAT, 3_000_000n], { account: petugas.account }),
        taxverse,
        "TarifDiubah",
        [PLAT, TARIF, 3_000_000n],
      );
      assert.equal((await taxverse.read.getKendaraan([PLAT])).tarifTahunan, 3_000_000n);
    });

    it("tidak bisa mengubah tarif kendaraan yang belum terdaftar", async function () {
      const { taxverse } = await deployDenganPetugas();
      await viem.assertions.revertWithCustomErrorWithArgs(
        taxverse.write.ubahTarif([PLAT, 3_000_000n], { account: petugas.account }),
        taxverse,
        "KendaraanTidakTerdaftar",
        [PLAT],
      );
    });

    it("tarif baru tidak boleh nol", async function () {
      const { taxverse } = await deployDenganPetugas();
      await daftarContoh(taxverse);
      await viem.assertions.revertWithCustomError(
        taxverse.write.ubahTarif([PLAT, 0n], { account: petugas.account }),
        taxverse,
        "TarifNol",
      );
    });

    it("warga biasa tidak bisa mengubah tarif", async function () {
      const { taxverse } = await deployDenganPetugas();
      await daftarContoh(taxverse);
      await viem.assertions.revertWithCustomError(
        taxverse.write.ubahTarif([PLAT, 1n], { account: warga.account }),
        taxverse,
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("bayar pajak", function () {
    // Kendaraan terdaftar + warga sudah punya MockIDR dan sudah approve
    async function siapBayar() {
      const hasil = await deployDenganPetugas();
      const berlakuSampai = await daftarContoh(hasil.taxverse);
      await hasil.token.write.faucet({ account: warga.account });
      await hasil.token.write.approve([hasil.taxverse.address, TARIF], { account: warga.account });
      return { ...hasil, berlakuSampai };
    }

    it("tepat waktu: token pindah ke kas dan masa berlaku +365 hari dari jatuh tempo", async function () {
      const { token, taxverse, berlakuSampai } = await siapBayar();
      const saldoWargaAwal = await token.read.balanceOf([warga.account.address]);

      await taxverse.write.bayarPajak([PLAT], { account: warga.account });

      assert.equal(await token.read.balanceOf([warga.account.address]), saldoWargaAwal - TARIF);
      assert.equal(await token.read.balanceOf([kas.account.address]), TARIF);
      assert.equal((await taxverse.read.getKendaraan([PLAT])).berlakuSampai, berlakuSampai + SATU_TAHUN);
    });

    it("memancarkan event PajakDibayar sebagai bukti", async function () {
      const { taxverse, berlakuSampai } = await siapBayar();
      await viem.assertions.emitWithArgs(
        taxverse.write.bayarPajak([PLAT], { account: warga.account }),
        taxverse,
        "PajakDibayar",
        [PLAT, getAddress(warga.account.address), TARIF, 0n, berlakuSampai + SATU_TAHUN],
      );
    });

    it("telat: masa berlaku +365 hari dihitung dari tanggal bayar", async function () {
      const { token, taxverse, berlakuSampai } = await siapBayar();
      await token.write.approve([taxverse.address, TARIF * 2n], { account: warga.account });
      await networkHelpers.time.increaseTo(berlakuSampai + 30n * 24n * 60n * 60n);

      const hash = await taxverse.write.bayarPajak([PLAT], { account: warga.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const waktuBayar = (await publicClient.getBlock({ blockNumber: receipt.blockNumber })).timestamp;

      assert.equal((await taxverse.read.getKendaraan([PLAT])).berlakuSampai, waktuBayar + SATU_TAHUN);
    });

    it("orang lain boleh membayarkan, pemilik tidak berubah", async function () {
      const { token, taxverse } = await siapBayar();
      await token.write.faucet({ account: keluarga.account });
      await token.write.approve([taxverse.address, TARIF], { account: keluarga.account });

      await taxverse.write.bayarPajak([PLAT], { account: keluarga.account });

      assert.equal((await taxverse.read.getKendaraan([PLAT])).pemilik, getAddress(warga.account.address));
      assert.equal(await token.read.balanceOf([kas.account.address]), TARIF);
    });

    it("bisa bayar di muka beberapa tahun", async function () {
      const { token, taxverse, berlakuSampai } = await siapBayar();
      await token.write.approve([taxverse.address, TARIF * 2n], { account: warga.account });

      await taxverse.write.bayarPajak([PLAT], { account: warga.account });
      await taxverse.write.bayarPajak([PLAT], { account: warga.account });

      assert.equal((await taxverse.read.getKendaraan([PLAT])).berlakuSampai, berlakuSampai + 2n * SATU_TAHUN);
    });

    it("ditolak jika kendaraan belum terdaftar", async function () {
      const { taxverse } = await siapBayar();
      const platLain = keccak256(toHex("D9999ZZ"));
      await viem.assertions.revertWithCustomErrorWithArgs(
        taxverse.write.bayarPajak([platLain], { account: warga.account }),
        taxverse,
        "KendaraanTidakTerdaftar",
        [platLain],
      );
    });

    it("ditolak jika belum approve", async function () {
      const { token, taxverse } = await siapBayar();
      await token.write.approve([taxverse.address, 0n], { account: warga.account });
      await viem.assertions.revertWithCustomError(
        taxverse.write.bayarPajak([PLAT], { account: warga.account }),
        token,
        "ERC20InsufficientAllowance",
      );
    });

    it("ditolak jika saldo tidak cukup, dan masa berlaku tidak berubah", async function () {
      const { token, taxverse, berlakuSampai } = await siapBayar();
      // keluarga approve tapi tidak punya saldo
      await token.write.approve([taxverse.address, TARIF], { account: keluarga.account });
      await viem.assertions.revertWithCustomError(
        taxverse.write.bayarPajak([PLAT], { account: keluarga.account }),
        token,
        "ERC20InsufficientBalance",
      );
      assert.equal((await taxverse.read.getKendaraan([PLAT])).berlakuSampai, berlakuSampai);
    });
  });

  describe("baca data", function () {
    it("kendaraan yang belum terdaftar mengembalikan data kosong", async function () {
      const { taxverse } = await deploy();
      const k = await taxverse.read.getKendaraan([keccak256(toHex("B1234XYZ"))]);
      assert.equal(k.pemilik, zeroAddress);
      assert.equal(k.aktif, false);
      assert.equal(k.tarifTahunan, 0n);
    });
  });
});
