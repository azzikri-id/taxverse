// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TaxVerse
/// @notice Pencatatan kendaraan dan pembayaran Pajak Kendaraan Bermotor (PKB) di blockchain.
/// @dev Simulasi untuk testnet. Data pribadi pemilik TIDAK disimpan di sini, hanya hash-nya.
contract TaxVerse is AccessControl {
    using SafeERC20 for IERC20;

    // ─────────────────────────────── Role ───────────────────────────────

    /// @notice Role untuk petugas Samsat yang boleh mendaftarkan kendaraan.
    bytes32 public constant PETUGAS_ROLE = keccak256("PETUGAS_ROLE");

    /// @notice Lama perpanjangan masa berlaku untuk setiap pembayaran.
    uint64 public constant MASA_BERLAKU = 365 days;

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
    error VehicleIdKosong();
    error HashKosong();
    error TarifNol();
    error MasaBerlakuKosong();
    error KendaraanSudahTerdaftar(bytes32 vehicleId);
    error KendaraanTidakTerdaftar(bytes32 vehicleId);
    error KendaraanTidakAktif(bytes32 vehicleId);

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

    // ────────────────────────────── Petugas ─────────────────────────────

    /// @notice Daftarkan kendaraan baru.
    /// @param vehicleId keccak256 dari nomor plat yang sudah dinormalisasi.
    /// @param pemilik Alamat wallet pemilik kendaraan.
    /// @param hashDataPemilik Hash data pribadi pemilik yang disimpan off-chain.
    /// @param tarifTahunan Besar pajak per tahun dalam MockIDR.
    /// @param berlakuSampai Akhir masa berlaku pajak saat ini (unix timestamp). Boleh di masa lalu
    ///        jika kendaraan lama yang pajaknya sudah telat dimasukkan ke sistem.
    function daftarKendaraan(
        bytes32 vehicleId,
        address pemilik,
        bytes32 hashDataPemilik,
        uint256 tarifTahunan,
        uint64 berlakuSampai
    ) external onlyRole(PETUGAS_ROLE) {
        if (vehicleId == bytes32(0)) revert VehicleIdKosong();
        if (pemilik == address(0)) revert AlamatNol();
        if (hashDataPemilik == bytes32(0)) revert HashKosong();
        if (tarifTahunan == 0) revert TarifNol();
        if (berlakuSampai == 0) revert MasaBerlakuKosong();
        if (_terdaftar(vehicleId)) revert KendaraanSudahTerdaftar(vehicleId);

        _kendaraan[vehicleId] = Kendaraan({
            pemilik: pemilik,
            berlakuSampai: berlakuSampai,
            aktif: true,
            hashDataPemilik: hashDataPemilik,
            tarifTahunan: tarifTahunan,
            terdaftarPada: uint64(block.timestamp)
        });

        emit KendaraanDidaftarkan(vehicleId, pemilik, tarifTahunan);
    }

    /// @notice Ubah tarif pajak tahunan sebuah kendaraan.
    function ubahTarif(bytes32 vehicleId, uint256 tarifBaru) external onlyRole(PETUGAS_ROLE) {
        _wajibTerdaftar(vehicleId);
        if (tarifBaru == 0) revert TarifNol();

        Kendaraan storage k = _kendaraan[vehicleId];
        emit TarifDiubah(vehicleId, k.tarifTahunan, tarifBaru);
        k.tarifTahunan = tarifBaru;
    }

    // ───────────────────────────── Pembayaran ───────────────────────────

    /// @notice Bayar pajak tahunan sebuah kendaraan dengan MockIDR.
    /// @dev Pembayar harus lebih dulu memanggil `token.approve(alamatTaxVerse, total)`.
    ///      Siapa pun boleh membayar (mis. keluarga), pemilik kendaraan tidak berubah.
    function bayarPajak(bytes32 vehicleId) external {
        _wajibTerdaftar(vehicleId);
        Kendaraan storage k = _kendaraan[vehicleId];
        if (!k.aktif) revert KendaraanTidakAktif(vehicleId);

        (uint256 pokok, uint256 denda) = _hitungTagihan(k);

        // Checks-effects-interactions: ubah state dulu, baru panggil kontrak lain (token).
        // Tepat waktu: lanjut dari tanggal jatuh tempo. Telat: mulai dari hari ini.
        uint64 mulai = k.berlakuSampai > block.timestamp ? k.berlakuSampai : uint64(block.timestamp);
        uint64 berlakuBaru = mulai + MASA_BERLAKU;
        k.berlakuSampai = berlakuBaru;

        emit PajakDibayar(vehicleId, msg.sender, pokok, denda, berlakuBaru);

        token.safeTransferFrom(msg.sender, kas, pokok + denda);
    }

    // ─────────────────────────────── Baca ───────────────────────────────

    /// @notice Ambil data lengkap sebuah kendaraan. Field kosong jika belum terdaftar.
    function getKendaraan(bytes32 vehicleId) external view returns (Kendaraan memory) {
        return _kendaraan[vehicleId];
    }

    // ───────────────────────────── Internal ─────────────────────────────

    /// @dev Kendaraan dianggap terdaftar jika pernah didaftarkan, walaupun nanti diblokir.
    function _terdaftar(bytes32 vehicleId) internal view returns (bool) {
        return _kendaraan[vehicleId].terdaftarPada != 0;
    }

    function _wajibTerdaftar(bytes32 vehicleId) internal view {
        if (!_terdaftar(vehicleId)) revert KendaraanTidakTerdaftar(vehicleId);
    }

    /// @dev Pokok = tarif tahunan. Denda masih 0; rumusnya ditambahkan di M1 langkah 4.
    function _hitungTagihan(Kendaraan storage k) internal view returns (uint256 pokok, uint256 denda) {
        pokok = k.tarifTahunan;
        denda = 0;
    }
}
