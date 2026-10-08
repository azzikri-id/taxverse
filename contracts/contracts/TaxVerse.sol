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

    /// @notice Satu "bulan" untuk perhitungan denda.
    uint64 public constant SATU_BULAN = 30 days;

    /// @notice Status berubah jadi JATUH_TEMPO jika sisa masa berlaku <= nilai ini.
    uint64 public constant BATAS_JATUH_TEMPO = 30 days;

    /// @notice 100% dalam basis point (1% = 100 bps).
    uint16 public constant BPS = 10_000;

    enum Status {
        TIDAK_TERDAFTAR,
        AKTIF,
        JATUH_TEMPO,
        TERLAMBAT
    }

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

    /// @notice Denda per bulan keterlambatan, dalam bps dari pokok (default 200 = 2%).
    uint16 public dendaBpsPerBulan;

    /// @notice Batas maksimal denda, dalam bps dari pokok (default 4800 = 48%).
    uint16 public dendaMaksBps;

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
    event ParameterDendaDiubah(uint16 bpsPerBulan, uint16 maksBps);

    // ─────────────────────────────── Error ──────────────────────────────

    error AlamatNol();
    error VehicleIdKosong();
    error HashKosong();
    error TarifNol();
    error MasaBerlakuKosong();
    error KendaraanSudahTerdaftar(bytes32 vehicleId);
    error KendaraanTidakTerdaftar(bytes32 vehicleId);
    error KendaraanTidakAktif(bytes32 vehicleId);
    error ParameterDendaTidakValid();

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
        _setParameterDenda(200, 4800); // 2% per bulan, maksimal 48%
    }

    // ─────────────────────────────── Admin ──────────────────────────────

    /// @notice Ganti alamat kas penerima pembayaran.
    function setKas(address kasBaru) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (kasBaru == address(0)) revert AlamatNol();
        emit KasDiubah(kas, kasBaru);
        kas = kasBaru;
    }

    /// @notice Ubah aturan denda. Contoh: (200, 4800) = 2% per bulan, maksimal 48%.
    function setParameterDenda(uint16 bpsPerBulan, uint16 maksBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setParameterDenda(bpsPerBulan, maksBps);
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

    /// @notice Rincian tagihan jika dibayar sekarang.
    /// @dev Denda bisa naik jika transaksi bayar masuk blok setelah melewati batas bulan,
    ///      jadi frontend sebaiknya approve sedikit lebih besar dari `total`.
    function hitungTagihan(bytes32 vehicleId) external view returns (uint256 pokok, uint256 denda, uint256 total) {
        _wajibTerdaftar(vehicleId);
        (pokok, denda) = _hitungTagihan(_kendaraan[vehicleId]);
        total = pokok + denda;
    }

    /// @notice Status pajak sebuah kendaraan. Tidak pernah revert, aman dipakai untuk cek publik.
    function statusPajak(bytes32 vehicleId) external view returns (Status) {
        Kendaraan storage k = _kendaraan[vehicleId];
        if (!k.aktif) return Status.TIDAK_TERDAFTAR;
        if (block.timestamp > k.berlakuSampai) return Status.TERLAMBAT;
        if (k.berlakuSampai - block.timestamp <= BATAS_JATUH_TEMPO) return Status.JATUH_TEMPO;
        return Status.AKTIF;
    }

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

    /// @dev Pokok = tarif tahunan. Denda = pokok x (bulan terlambat x bps per bulan), dibatasi maksimal.
    ///      Bulan dibulatkan ke atas: telat 1 hari = 1 bulan, telat 31 hari = 2 bulan.
    function _hitungTagihan(Kendaraan storage k) internal view returns (uint256 pokok, uint256 denda) {
        pokok = k.tarifTahunan;
        if (block.timestamp <= k.berlakuSampai) return (pokok, 0);

        uint256 bulanTerlambat = (block.timestamp - k.berlakuSampai + SATU_BULAN - 1) / SATU_BULAN;
        uint256 persenBps = bulanTerlambat * dendaBpsPerBulan;
        if (persenBps > dendaMaksBps) persenBps = dendaMaksBps;

        denda = (pokok * persenBps) / BPS;
    }

    function _setParameterDenda(uint16 bpsPerBulan, uint16 maksBps) internal {
        if (maksBps > BPS || bpsPerBulan > maksBps) revert ParameterDendaTidakValid();
        dendaBpsPerBulan = bpsPerBulan;
        dendaMaksBps = maksBps;
        emit ParameterDendaDiubah(bpsPerBulan, maksBps);
    }
}
