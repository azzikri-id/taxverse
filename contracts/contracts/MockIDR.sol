// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockIDR
/// @notice Token simulasi Rupiah untuk membayar pajak di TaxVerse. Khusus testnet, tidak bernilai.
/// @dev decimals = 0, jadi 1 token = Rp1.
contract MockIDR is ERC20, Ownable {
    /// @notice Jumlah token yang didapat sekali ambil dari faucet (Rp10.000.000).
    uint256 public constant FAUCET_AMOUNT = 10_000_000;

    /// @notice Jeda minimal antar pengambilan faucet per alamat.
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @notice Waktu terakhir sebuah alamat mengambil faucet.
    mapping(address => uint256) public lastFaucetAt;

    /// @notice Dilempar jika faucet diambil sebelum cooldown selesai.
    error FaucetCooldown(uint256 availableAt);

    constructor(address initialOwner) ERC20("Mock Rupiah", "mIDR") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice Ambil token gratis untuk testing, maksimal sekali per hari.
    function faucet() external {
        uint256 last = lastFaucetAt[msg.sender];
        if (last != 0 && block.timestamp < last + FAUCET_COOLDOWN) {
            revert FaucetCooldown(last + FAUCET_COOLDOWN);
        }
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Cetak token baru. Hanya pemilik kontrak (admin).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
