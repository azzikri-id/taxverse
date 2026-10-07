# PRD — TaxVerse: Sistem Pajak Kendaraan Berbasis Blockchain

| | |
|---|---|
| **Pemilik produk** | Azzikri AS ([@azzikri-id](https://github.com/azzikri-id)) |
| **Status** | Draft v0.1 |
| **Tanggal** | 7 Oktober 2026 |
| **Jenis proyek** | Proyek portofolio / pembelajaran (simulasi, bukan sistem resmi pemerintah) |

> **Catatan:** Semua tarif, denda, dan aturan pajak di dokumen ini adalah **penyederhanaan untuk simulasi**, tidak mewakili regulasi resmi.

---

## 1. Ringkasan

TaxVerse adalah aplikasi web terdesentralisasi (dApp) untuk mencatat pendaftaran kendaraan, pembayaran Pajak Kendaraan Bermotor (PKB), dan status pajak di blockchain. Bukti pembayaran dan status pajak tersimpan di smart contract Solidity sehingga **transparan, tidak bisa dimanipulasi, dan bisa diverifikasi siapa saja**. Data pribadi pemilik tetap disimpan off-chain di Supabase.

## 2. Latar Belakang & Masalah

| Masalah | Dampak |
|---|---|
| Status pajak hanya bisa dicek lewat sistem terpusat milik instansi | Pihak ketiga (calon pembeli mobil bekas, petugas di lapangan) bergantung pada satu server dan tidak bisa memverifikasi secara mandiri |
| Bukti bayar berupa kertas atau PDF yang mudah dipalsukan | Muncul risiko pemalsuan notice pajak dan STNK |
| Riwayat pembayaran dan kepemilikan sulit ditelusuri | Pembeli kendaraan bekas tidak tahu apakah ada tunggakan pajak |
| Pencatatan manual membuka peluang manipulasi data | Kepercayaan publik terhadap pengelolaan pajak menurun |

**Hipotesis:** mencatat pembayaran dan status pajak di blockchain membuat proses verifikasi menjadi publik, instan, dan tahan manipulasi, tanpa membuka data pribadi.

## 3. Tujuan & Non-Tujuan

### Tujuan
1. Petugas dapat mendaftarkan kendaraan beserta tarif pajaknya ke blockchain.
2. Pemilik kendaraan dapat membayar pajak lewat wallet dan langsung menerima bukti on-chain.
3. Siapa pun dapat mengecek status pajak kendaraan dari nomor polisi, tanpa login.
4. Data pribadi tidak pernah disimpan on-chain.
5. Proyek ter-deploy di testnet dengan kontrak terverifikasi, sehingga layak dijadikan portofolio.

### Non-Tujuan (di luar cakupan)
- Integrasi dengan sistem Samsat atau Korlantas yang asli.
- Pembayaran dengan uang sungguhan (Rupiah atau kripto mainnet).
- Perhitungan PKB yang lengkap sesuai perda (pajak progresif, BBNKB, opsen, dan sebagainya).
- Aplikasi mobile native.
- Deploy ke mainnet.

## 4. Pengguna (Persona)

| Persona | Deskripsi | Akses |
|---|---|---|
| **Admin** | Pengelola sistem (simulasi Bapenda/Samsat pusat) | Mengelola role petugas, mengatur parameter denda, alamat kas |
| **Petugas Samsat** | Memverifikasi dokumen dan mendaftarkan kendaraan | Mendaftarkan kendaraan, mengubah tarif, memproses balik nama |
| **Pemilik Kendaraan** | Warga yang memiliki kendaraan | Melihat kendaraannya, membayar pajak, melihat riwayat |
| **Verifikator Publik** | Polisi, calon pembeli mobil bekas, masyarakat umum | Mengecek status pajak dan riwayat (read-only, tanpa wallet) |

## 5. User Stories

| ID | Sebagai… | Saya ingin… | Supaya… | Prioritas |
|---|---|---|---|---|
| US-01 | Admin | memberi atau mencabut role petugas | hanya pihak berwenang yang bisa mendaftarkan kendaraan | P0 |
| US-02 | Petugas | mendaftarkan kendaraan (plat, pemilik, tarif) | kendaraan tercatat di sistem | P0 |
| US-03 | Pemilik | menghubungkan wallet dan melihat daftar kendaraan saya | saya tahu status pajak tiap kendaraan | P0 |
| US-04 | Pemilik | membayar pajak tahunan lewat wallet | pajak saya aktif dan ada bukti yang tidak bisa dipalsukan | P0 |
| US-05 | Publik | mengetik nomor plat dan melihat status pajak | saya bisa memverifikasi tanpa bergantung ke instansi | P0 |
| US-06 | Pemilik/Publik | melihat riwayat pembayaran beserta link ke block explorer | riwayatnya transparan dan bisa diaudit | P0 |
| US-07 | Sistem | menghitung denda otomatis jika pembayaran terlambat | aturan denda konsisten dan tidak bisa dinegosiasi | P1 |
| US-08 | Petugas | memproses balik nama ke pemilik baru | riwayat kepemilikan tercatat permanen | P1 |
| US-09 | Pemilik | mengunduh bukti bayar (PDF/QR) yang menautkan ke transaksi on-chain | bukti fisik bisa diverifikasi dengan scan QR | P1 |
| US-10 | Admin | melihat dashboard total penerimaan dan tunggakan | ada gambaran pendapatan pajak | P2 |
| US-11 | Pemilik | memiliki kendaraan sebagai NFT (ERC-721) | kepemilikan digital bisa dibuktikan secara standar | P2 |

**P0** = wajib untuk MVP · **P1** = setelah MVP · **P2** = pengembangan lanjutan

## 6. Arsitektur

### 6.1 Prinsip pembagian data

| On-chain (Solidity) | Off-chain (Supabase) |
|---|---|
| ID kendaraan (hash nomor plat) | Nomor plat asli, merek, tipe, tahun, warna |
| Alamat wallet pemilik | Nama, NIK, alamat pemilik |
| Hash data pemilik (untuk cek integritas) | Dokumen dan foto (STNK, BPKB) di Supabase Storage |
| Tarif tahunan, masa berlaku pajak | Cache riwayat transaksi untuk pencarian cepat |
| Event pembayaran dan balik nama | Profil petugas, log aplikasi |
| Daftar role (admin, petugas) | |

**Aturan utama:** data pribadi (PII) **tidak boleh** masuk ke blockchain, sesuai prinsip UU Pelindungan Data Pribadi (UU PDP). On-chain cukup menyimpan hash.

### 6.2 Diagram

```
┌────────────────────────────┐
│   Frontend (React + Vite)  │
│  wagmi · viem · RainbowKit │
└──────┬──────────────┬──────┘
       │ read/write   │ query
       ▼              ▼
┌──────────────┐  ┌─────────────────────┐
│ Smart        │  │ Supabase            │
│ Contracts    │  │ - Postgres (PII)    │
│ (Sepolia)    │  │ - Storage (dokumen) │
│ - TaxVerse   │  │                     │
│ - MockIDR    │  └─────────▲───────────┘
└──────┬───────┘            │ sinkronisasi event
       │ events             │ (Edge Function / script)
       └────────────────────┘
```

### 6.3 Tech stack

| Lapisan | Teknologi |
|---|---|
| Smart contract | Solidity ^0.8.24, Hardhat, OpenZeppelin (AccessControl, ERC20, Pausable, ReentrancyGuard) |
| Testing kontrak | Hardhat + Chai, target coverage ≥ 90% |
| Jaringan | Hardhat local (dev), Ethereum **Sepolia** (testnet) |
| RPC | Alchemy atau Infura |
| Frontend | React + Vite + TypeScript, Tailwind CSS |
| Web3 di frontend | wagmi, viem, RainbowKit |
| Backend | Supabase (Postgres, Storage, Edge Functions) |
| Hosting | Vercel (frontend) |
| CI | GitHub Actions (compile, test, lint) |

## 7. Spesifikasi Smart Contract

### 7.1 `MockIDR.sol` (ERC-20)
Token simulasi Rupiah untuk pembayaran pajak, supaya simulasinya realistis (nominal Rupiah, bukan ETH).
- `decimals = 0`, sehingga 1 token = Rp1
- `faucet()`: siapa pun bisa mengambil token gratis untuk testing (dengan batas jumlah dan cooldown)
- `mint(to, amount)`: khusus admin

### 7.2 `TaxVerse.sol`

**Roles:** `DEFAULT_ADMIN_ROLE`, `PETUGAS_ROLE`

**Struct:**
```solidity
struct Kendaraan {
    address pemilik;
    bytes32 hashDataPemilik;    // keccak256 dari data PII di Supabase
    uint256 tarifTahunan;       // dalam MockIDR (Rupiah)
    uint64  berlakuSampai;      // unix timestamp masa berlaku pajak
    uint64  terdaftarPada;
    bool    aktif;              // false jika diblokir/dihapus
}
```

**Penyimpanan:** `mapping(bytes32 => Kendaraan)` dengan key `vehicleId = keccak256(normalisasi(nomorPlat))`. Normalisasinya: huruf besar dan tanpa spasi, misalnya `"B 1234 XYZ"` menjadi `"B1234XYZ"`.

**Fungsi:**

| Fungsi | Akses | Deskripsi |
|---|---|---|
| `daftarKendaraan(vehicleId, pemilik, hashData, tarif, berlakuSampai)` | Petugas | Mendaftarkan kendaraan baru |
| `ubahTarif(vehicleId, tarifBaru)` | Petugas | Memperbarui tarif tahunan |
| `bayarPajak(vehicleId)` | Siapa saja | Menarik `tarif + denda` MockIDR (via `transferFrom`) ke kas, lalu memperpanjang masa berlaku 365 hari |
| `hitungTagihan(vehicleId) view` | Publik | Mengembalikan `(pokok, denda, total)` |
| `statusPajak(vehicleId) view` | Publik | Mengembalikan `AKTIF`, `JATUH_TEMPO` (≤ 30 hari lagi), atau `TERLAMBAT` |
| `baliknama(vehicleId, pemilikBaru, hashDataBaru)` | Petugas | Mengganti pemilik (P1). Syarat: pajak tidak terlambat |
| `setParameterDenda(persenPerBulan, maksPersen)` | Admin | Default 2%/bulan, maksimal 48% (simulasi) |
| `setKas(alamat)` | Admin | Mengatur alamat penerima pembayaran |
| `pause()` / `unpause()` | Admin | Tombol darurat |

**Events** (dipakai sebagai sumber riwayat):
```solidity
event KendaraanDidaftarkan(bytes32 indexed vehicleId, address indexed pemilik, uint256 tarif);
event PajakDibayar(bytes32 indexed vehicleId, address indexed pembayar, uint256 pokok, uint256 denda, uint64 berlakuSampai);
event BalikNama(bytes32 indexed vehicleId, address indexed dari, address indexed ke);
event TarifDiubah(bytes32 indexed vehicleId, uint256 tarifLama, uint256 tarifBaru);
```

**Aturan bisnis:**
- Pembayaran tepat waktu: masa berlaku baru = `berlakuSampai + 365 hari`.
- Pembayaran terlambat: masa berlaku baru = `waktuBayar + 365 hari`, ditambah denda `pokok × persenPerBulan × jumlahBulanTerlambat`, dibatasi `maksPersen`.
- Siapa pun boleh membayar untuk kendaraan mana pun (misalnya keluarga membayarkan), tetapi status pemilik tidak berubah.

## 8. Model Data Supabase

```
petugas        (wallet_address text PK, nama, created_at)  -- hak akses tetap dari role on-chain
pemilik        (id uuid PK, nama, nik_terenkripsi, alamat, wallet_address unique, created_at)
kendaraan      (vehicle_id text PK  -- hex bytes32, sama dengan on-chain
                plat_nomor unique, merek, tipe, tahun, warna, pemilik_id FK, created_at)
dokumen        (id, vehicle_id FK, jenis, storage_path, created_at)
riwayat_bayar  (tx_hash PK, vehicle_id FK, pembayar, pokok, denda, berlaku_sampai, block_time)
```

- **Row Level Security (RLS):** publik (anon key) hanya bisa membaca `kendaraan` (tanpa PII) dan `riwayat_bayar`. Tabel berisi PII tertutup untuk anon.
- **Penulisan oleh petugas:** karena tidak memakai Supabase Auth, frontend mengirim data ke **Edge Function** beserta tanda tangan wallet (`signMessage`). Edge Function memverifikasi tanda tangan, mengecek `PETUGAS_ROLE` on-chain, lalu menulis memakai service role key.
- **Integritas:** `hashDataPemilik` on-chain = `keccak256` dari JSON PII yang dikanonikalisasi. Aplikasi menampilkan badge "Data terverifikasi" jika hash cocok.
- `riwayat_bayar` hanya **cache**. Sumber kebenaran tetap event on-chain.

## 9. Alur Utama

**A. Pendaftaran kendaraan (Petugas)**
1. Petugas login (wallet dengan `PETUGAS_ROLE`) dan mengisi form data kendaraan serta pemilik.
2. Frontend menyimpan PII ke Supabase dan menghitung `hashDataPemilik`.
3. Petugas menandatangani transaksi `daftarKendaraan`.
4. Setelah transaksi terkonfirmasi, status di Supabase diperbarui menjadi "on-chain".

**B. Pembayaran pajak (Pemilik)**
1. Pemilik menghubungkan wallet, memilih kendaraan, dan melihat tagihan (`hitungTagihan`).
2. Transaksi 1: `MockIDR.approve(TaxVerse, total)`.
3. Transaksi 2: `TaxVerse.bayarPajak(vehicleId)`.
4. Halaman sukses menampilkan tx hash, link ke Etherscan, dan tombol unduh bukti bayar (P1).

**C. Cek status (Publik)**
1. Pengguna mengetik nomor plat, lalu frontend menormalisasi dan menghitung `vehicleId`.
2. Frontend memanggil `statusPajak` dan `hitungTagihan` (read-only, tanpa wallet), lalu menampilkan status dan riwayat event.

## 10. Halaman Frontend

| Halaman | Pengguna | Isi utama |
|---|---|---|
| `/` Landing | Semua | Penjelasan singkat dan kotak cek plat |
| `/cek/:plat` | Publik | Status pajak, masa berlaku, riwayat pembayaran |
| `/saya` | Pemilik | Daftar kendaraan milik wallet, tombol bayar |
| `/bayar/:vehicleId` | Pemilik | Rincian tagihan, alur approve lalu bayar |
| `/petugas` | Petugas | Form daftar kendaraan, ubah tarif, balik nama |
| `/admin` | Admin | Kelola role, parameter denda, statistik |
| `/faucet` | Semua | Ambil MockIDR dan link faucet ETH Sepolia |

## 11. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Keamanan** | Pakai OpenZeppelin, cek role di setiap fungsi tulis, `ReentrancyGuard` di `bayarPajak`, pola checks-effects-interactions, `Pausable` |
| **Privasi** | Tidak ada PII on-chain. NIK dienkripsi di Supabase. RLS aktif di semua tabel |
| **Kualitas** | Unit test untuk setiap fungsi dan skenario gagal, coverage ≥ 90%, CI hijau sebelum merge |
| **Biaya gas** | Struct dipadatkan (`uint64` untuk timestamp), memakai `bytes32` bukan `string` sebagai key |
| **UX** | Status transaksi jelas (menunggu tanda tangan, pending, sukses/gagal), pesan error dalam Bahasa Indonesia, responsif di HP |
| **Transparansi** | Kontrak terverifikasi di Etherscan, alamat kontrak ditampilkan di footer |
| **Secrets** | Private key dan API key hanya di `.env` (masuk `.gitignore`), tidak pernah di-commit |

## 12. Metrik Keberhasilan (untuk portofolio)

- [ ] Kontrak ter-deploy dan **terverifikasi** di Sepolia
- [ ] Semua user story P0 berjalan end-to-end di demo live
- [ ] Test coverage kontrak ≥ 90% dan CI hijau
- [ ] Demo live di Vercel dan bisa dicoba orang lain dalam < 5 menit (faucet tersedia)
- [ ] README berisi diagram arsitektur, GIF demo, dan cara menjalankan secara lokal
- [ ] Postingan LinkedIn yang membahas proyek ini

## 13. Milestone

| # | Milestone | Isi | Estimasi |
|---|---|---|---|
| M0 | Fondasi | Belajar Solidity dasar (Remix), setup monorepo, Hardhat, GitHub | Minggu 1–2 |
| M1 | Kontrak inti | `MockIDR`, `TaxVerse` (P0) beserta test lengkap | Minggu 3–4 |
| M2 | Deploy | Deploy dan verifikasi di Sepolia, script deploy | Minggu 4 |
| M3 | Frontend P0 | Connect wallet, cek status, halaman pemilik, bayar, panel petugas | Minggu 5–6 |
| M4 | Supabase | Tabel, RLS, penyimpanan PII, cek hash, sinkronisasi riwayat | Minggu 7 |
| M5 | Polish & rilis | Fitur P1, deploy Vercel, README, CI, postingan LinkedIn | Minggu 8 |

## 14. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Bug di kontrak yang sudah di-deploy (immutable) | Test menyeluruh sebelum deploy. Untuk testnet cukup redeploy, tanpa proxy upgradeable agar tetap sederhana |
| PII bocor ke blockchain | Code review khusus: argumen fungsi kontrak hanya berisi hash atau ID |
| Hash nomor plat bisa ditebak (brute-force) | Bisa diterima, karena status pajak memang dirancang publik. Yang dilindungi adalah PII, bukan plat |
| Pengguna awam kesulitan memakai wallet | Halaman faucet dan panduan langkah demi langkah. Pertimbangkan account abstraction (P2) |
| Faucet Sepolia sulit didapat | Sediakan petunjuk beberapa faucet. Demo bisa memakai wallet yang sudah terisi |
| Scope creep | Kerjakan P0 dulu sampai selesai end-to-end sebelum menyentuh P1/P2 |

## 15. Keputusan & Pertanyaan Terbuka

### Sudah diputuskan (7 Oktober 2026)
- **Autentikasi petugas:** cukup wallet dengan `PETUGAS_ROLE` on-chain. Supabase Auth tidak dipakai di MVP.
- **Wilayah:** satu wilayah saja di MVP, dengan satu set parameter tarif dan denda. Multi-provinsi masuk pengembangan lanjutan.
- **Nama produk:** TaxVerse.

### Masih terbuka
1. Apakah sinkronisasi event ke Supabase memakai Edge Function terjadwal, atau langsung dibaca dari RPC di frontend untuk MVP?
