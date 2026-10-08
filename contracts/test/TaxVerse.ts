import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, toHex, zeroAddress } from "viem";

describe("TaxVerse", async function () {
  const { viem } = await network.create();
  const [admin, petugas, warga, kas] = await viem.getWalletClients();

  const PETUGAS_ROLE = keccak256(toHex("PETUGAS_ROLE"));
  const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

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
