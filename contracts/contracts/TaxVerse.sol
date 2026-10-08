// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TaxVerse
/// @notice Pencatatan kendaraan dan pembayaran Pajak Kendaraan Bermotor (PKB) di blockchain.
/// @dev Simulasi untuk testnet. Data pribadi pemilik TIDAK disimpan di sini, hanya hash-nya.
contract TaxVerse is AccessControl {
    // ─────────────────────────────── Role ───────────────────────────────

    /// @notice Role untuk petugas Samsat yang boleh mendaftarkan kendaraan.
    bytes32 public constant PETUGAS_ROLE = keccak256("PETUGAS_ROLE");

    // ─────────────────────────────── Data ───────────────────────────────

    /// @dev Urutan field disusun supaya hemat storage:
    ///      slot 0 = pemilik (20 byte) + berlakuSampai (8 byte) + aktif (1 byte).
    struct Kendaraan {
        address pemilik;
        uint64 berlakuSampai; // unix timestamp akhir masa berlaku pajak
        bool aktif; // false jika belum terdaftar atau diblokir
        bytes32 hashDataPemilik; // keccak256 dari data pribadi yang disimpan di Supabase
        uint256 tarifTahunan; // dalam MockIDR (1 token = Rp1)
        uint64 terdaftarPada;
    }

    /// @notice Token yang dipakai untuk membayar pajak (MockIDR).
    IERC20 public immutable token;

    /// @notice Alamat penerima pembayaran pajak (kas daerah).
    address public kas;

    /// @dev Key = vehicleId = keccak256(nomor plat yang sudah dinormalisasi, mis. "B1234XYZ").
    mapping(bytes32 vehicleId => Kendaraan) private _kendaraan;

    // ─────────────────────────────── Event ──────────────────────────────

    event KendaraanDidaftarkan(bytes32 indexed vehicleId, address indexed pemilik, uint256 tarif);
    event PajakDibayar(
        bytes32 indexed vehicleId, address indexed pembayar, uint256 pokok, uint256 denda, uint64 berlakuSampai
    );
    event BalikNama(bytes32 indexed vehicleId, address indexed dari, address indexed ke);
    event TarifDiubah(bytes32 indexed vehicleId, uint256 tarifLama, uint256 tarifBaru);
    event KasDiubah(address kasLama, address kasBaru);

    // ─────────────────────────────── Error ──────────────────────────────

    error AlamatNol();

    // ──────────────────────────── Constructor ───────────────────────────

    /// @param admin Alamat admin. Otomatis juga menjadi petugas.
    /// @param token_ Alamat kontrak MockIDR.
    /// @param kas_ Alamat penerima pembayaran pajak.
    constructor(address admin, IERC20 token_, address kas_) {
        if (admin == address(0) || address(token_) == address(0) || kas_ == address(0)) revert AlamatNol();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PETUGAS_ROLE, admin);

        token = token_;
        kas = kas_;
    }

    // ─────────────────────────────── Admin ──────────────────────────────

    /// @notice Ganti alamat kas penerima pembayaran.
    function setKas(address kasBaru) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (kasBaru == address(0)) revert AlamatNol();
        emit KasDiubah(kas, kasBaru);
        kas = kasBaru;
    }

    // ─────────────────────────────── Baca ───────────────────────────────

    /// @notice Ambil data lengkap sebuah kendaraan. Field kosong jika belum terdaftar.
    function getKendaraan(bytes32 vehicleId) external view returns (Kendaraan memory) {
        return _kendaraan[vehicleId];
    }
}
