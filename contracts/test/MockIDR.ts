import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("MockIDR", async function () {
  const { viem, networkHelpers } = await network.create();
  const [admin, user] = await viem.getWalletClients();

  async function deploy() {
    return viem.deployContract("MockIDR", [admin.account.address]);
  }

  it("memakai 0 desimal (1 token = Rp1)", async function () {
    const token = await deploy();
    assert.equal(await token.read.decimals(), 0);
    assert.equal(await token.read.symbol(), "mIDR");
  });

  it("faucet memberi Rp10.000.000", async function () {
    const token = await deploy();
    await token.write.faucet({ account: user.account });
    assert.equal(await token.read.balanceOf([user.account.address]), 10_000_000n);
  });

  it("faucet ditolak sebelum cooldown 1 hari selesai", async function () {
    const token = await deploy();
    await token.write.faucet({ account: user.account });
    await viem.assertions.revertWithCustomError(
      token.write.faucet({ account: user.account }),
      token,
      "FaucetCooldown",
    );
  });

  it("faucet bisa diambil lagi setelah 1 hari", async function () {
    const token = await deploy();
    await token.write.faucet({ account: user.account });
    await networkHelpers.time.increase(24 * 60 * 60);
    await token.write.faucet({ account: user.account });
    assert.equal(await token.read.balanceOf([user.account.address]), 20_000_000n);
  });

  it("hanya admin yang bisa mint", async function () {
    const token = await deploy();
    await token.write.mint([user.account.address, 500n]);
    assert.equal(await token.read.balanceOf([user.account.address]), 500n);

    await viem.assertions.revertWithCustomError(
      token.write.mint([user.account.address, 500n], { account: user.account }),
      token,
      "OwnableUnauthorizedAccount",
    );
  });
});
