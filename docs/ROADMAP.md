# Roadmap TaxVerse

Panduan langkah demi langkah dari nol sampai proyek siap dipamerkan. Centang `[x]` setiap langkah yang sudah selesai.

**Legenda:** 🤖 dikerjakan Claude · 🧑 dikerjakan kamu · 🤝 dikerjakan bersama

```
M0 Fondasi ──► M1 Kontrak ──► M2 Deploy ──► M3 Frontend ──► M4 Supabase ──► M5 Rilis
   ✅ selesai     ⏳ berikutnya
```

---

## M0 — Fondasi ✅

Tujuan: semua alat siap dan repo sudah online.

- [x] 🤝 Buat akun GitHub pribadi `azzikri-id` + 2FA
- [x] 🤖 Atur identitas git (email noreply)
- [x] 🤝 Tulis PRD ([PRD.md](PRD.md) / [PRD.pdf](PRD.pdf))
- [x] 🤖 Setup folder `contracts/` (Hardhat 3 + OpenZeppelin)
- [x] 🤖 Kontrak contoh `MockIDR.sol` + 5 test
- [x] 🤖 Setup folder `frontend/` (React + Vite + Tailwind + wagmi + RainbowKit)
- [x] 🤖 README, lisensi, `.gitignore`, CI GitHub Actions
- [x] 🤖 Repo public di [github.com/azzikri-id/taxverse](https://github.com/azzikri-id/taxverse)

**Tugas kecil untuk kamu:**
- [ ] 🧑 Jalankan `npm test` di folder `contracts`, lalu lihat 5 test lulus
- [ ] 🧑 Jalankan `npm run dev` di folder `frontend`, lalu buka `http://localhost:5173`
- [ ] 🧑 Siapkan akun MetaMask khusus development (tanpa aset asli)
- [ ] 🧑 Aktifkan "Keep my email addresses private" di GitHub Settings → Emails

---

## M1 — Kontrak Inti ⏳

Tujuan: kontrak `TaxVerse.sol` lengkap dan teruji. **Ini inti dari proyek.**

| # | Langkah | Hasil yang bisa kamu lihat |
|---|---|---|
| 1 | 🤖 **Kerangka & role**: `AccessControl`, `PETUGAS_ROLE`, struct `Kendaraan`, event | Test: admin bisa memberi dan mencabut role petugas |
| 2 | 🤖 **Daftar kendaraan**: `daftarKendaraan()` + validasi (tidak boleh dobel, alamat tidak boleh kosong) | Test: petugas bisa daftar, orang biasa ditolak |
| 3 | 🤖 **Bayar pajak**: `bayarPajak()` pakai MockIDR (`approve` → `transferFrom`), masa berlaku +365 hari | Test: saldo pindah ke kas, masa berlaku bertambah |
| 4 | 🤖 **Denda & status**: `hitungTagihan()`, `statusPajak()`, denda 2%/bulan (maks 48%) | Test: telat 3 bulan, denda 6% |
| 5 | 🤖 **Keamanan**: `Pausable`, `ReentrancyGuard`, checks-effects-interactions | Test: saat di-pause, semua transaksi ditolak |
| 6 | 🤖 **Script deploy**: modul Ignition untuk MockIDR + TaxVerse sekaligus | Kontrak jalan di blockchain lokal |

Setiap langkah: kode, ringkasan 3–5 poin, test lulus, lalu commit.

- [ ] 🧑 Setelah M1: jalankan `npm test` dan lihat semua test hijau

---

## M2 — Deploy ke Sepolia (Testnet)

Tujuan: kontrak online di blockchain publik dan bisa dilihat siapa saja.

- [ ] 🧑 Daftar [Alchemy](https://www.alchemy.com) (gratis) dan buat app Sepolia untuk mendapatkan RPC URL
- [ ] 🧑 Daftar [Etherscan](https://etherscan.io) dan buat API key (untuk verifikasi kontrak)
- [ ] 🧑 Ambil ETH Sepolia gratis dari faucet ke wallet development
- [ ] 🤝 Simpan secret ke Hardhat keystore (`npx hardhat keystore set ...`)
- [ ] 🤖 Deploy MockIDR + TaxVerse ke Sepolia
- [ ] 🤖 Verifikasi kontrak di Etherscan, supaya source code-nya terlihat publik
- [ ] 🤖 Catat alamat kontrak di README

**Hasil:** link Etherscan yang bisa kamu bagikan.

---

## M3 — Frontend

Tujuan: web yang bisa dipakai, terhubung ke kontrak.

| # | Halaman / fitur | Pengguna |
|---|---|---|
| 1 | 🤖 Hubungkan ABI + alamat kontrak ke frontend | — |
| 2 | 🤖 `/cek/:plat`: cek status pajak tanpa login | Publik |
| 3 | 🤖 `/faucet`: ambil MockIDR gratis | Semua |
| 4 | 🤖 `/saya`: daftar kendaraan milik wallet | Pemilik |
| 5 | 🤖 `/bayar/:id`: rincian tagihan → approve → bayar | Pemilik |
| 6 | 🤖 `/petugas`: form daftar kendaraan | Petugas |
| 7 | 🤖 `/admin`: kelola role & parameter denda | Admin |
| 8 | 🤖 Status transaksi yang jelas (menunggu, pending, sukses/gagal) + link Etherscan | Semua |

- [ ] 🧑 Coba alur lengkap: daftar kendaraan → ambil faucet → bayar → cek status

---

## M4 — Integrasi Supabase

Tujuan: data pribadi tersimpan aman di luar blockchain.

- [ ] 🧑 Buat project baru di [Supabase](https://supabase.com) (pakai login GitHub pribadi)
- [ ] 🤖 Buat tabel: `pemilik`, `kendaraan`, `dokumen`, `riwayat_bayar`, `petugas`
- [ ] 🤖 Atur Row Level Security (publik tidak bisa membaca data pribadi)
- [ ] 🤖 Edge Function: verifikasi tanda tangan wallet petugas, lalu simpan data
- [ ] 🤖 Hash data pemilik dan cocokkan dengan on-chain (badge "Data terverifikasi")
- [ ] 🤖 Sinkronisasi riwayat pembayaran dari event blockchain

---

## M5 — Polish & Rilis 🚀

Tujuan: proyek siap dipamerkan.

- [ ] 🤖 Fitur P1: balik nama, bukti bayar PDF + QR
- [ ] 🧑 Deploy frontend ke [Vercel](https://vercel.com) (login GitHub pribadi)
- [ ] 🤖 README final: screenshot/GIF demo, link demo live, link Etherscan
- [ ] 🤝 **Sesi bedah kode**: kamu baca ulang kode, tanya semua yang belum jelas
- [ ] 🤖 Daftar pertanyaan interview tentang proyek ini + latihan jawab
- [ ] 🧑 Tambahkan ke LinkedIn (bagian *Projects*) dan tulis postingan
- [ ] 🧑 Pin repo di profil GitHub

---

## Setelah MVP (opsional)

- Kendaraan sebagai NFT (ERC-721)
- Dashboard statistik penerimaan pajak
- Multi-wilayah dengan tarif berbeda
- Account abstraction, supaya pengguna tidak perlu punya ETH untuk gas
