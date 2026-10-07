# TaxVerse

**Sistem pajak kendaraan bermotor berbasis blockchain.** Status pajak dan bukti pembayaran dicatat di smart contract Solidity, sehingga transparan, tidak bisa dipalsukan, dan bisa diverifikasi siapa saja. Data pribadi tetap disimpan off-chain.

> Proyek portofolio/pembelajaran. Ini **simulasi** di testnet, bukan sistem resmi pemerintah, dan tarif serta dendanya disederhanakan.

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-3-yellow)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![License](https://img.shields.io/badge/license-MIT-blue)

## Masalah yang diselesaikan

- Status pajak hanya bisa dicek lewat sistem terpusat, sehingga pihak ketiga (misalnya pembeli mobil bekas) tidak bisa memverifikasi secara mandiri.
- Bukti bayar berupa kertas atau PDF mudah dipalsukan.
- Riwayat pembayaran dan kepemilikan sulit ditelusuri.

TaxVerse mencatat pembayaran dan status pajak di blockchain, jadi verifikasinya **publik, instan, dan tahan manipulasi**, tanpa membuka data pribadi.

## Arsitektur

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
│ - TaxVerse   │  │ - Edge Functions    │
│ - MockIDR    │  └─────────────────────┘
└──────────────┘
```

| On-chain | Off-chain (Supabase) |
|---|---|
| Hash nomor plat, alamat wallet pemilik, masa berlaku pajak, event pembayaran | Nama, NIK, alamat, dokumen kendaraan |

Detail lengkap ada di [Product Requirements Document](docs/PRD.md) ([PDF](docs/PRD.pdf)).

## Tech stack

| Lapisan | Teknologi |
|---|---|
| Smart contract | Solidity 0.8.28, Hardhat 3, OpenZeppelin 5 |
| Testing | Hardhat + `node:test` + viem |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4 |
| Web3 | wagmi 2, viem, RainbowKit |
| Backend | Supabase |
| Jaringan | Ethereum Sepolia (testnet) |

## Struktur repo

```
.
├── contracts/   # Smart contract, test, dan modul deploy (Hardhat)
├── frontend/    # dApp React
└── docs/        # PRD dan dokumentasi
```

## Menjalankan secara lokal

Prasyarat: Node.js 24+ dan MetaMask.

```bash
# 1. Smart contract
cd contracts
npm install
npm test                  # compile + jalankan test

# 2. Jalankan blockchain lokal (terminal terpisah) lalu deploy
npm run node
npm run deploy:local

# 3. Frontend
cd ../frontend
npm install
npm run dev               # http://localhost:5173
```

### Environment variable

**Frontend** (`frontend/.env.local`):

| Variabel | Keterangan |
|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Gratis dari [cloud.reown.com](https://cloud.reown.com). Opsional untuk MetaMask |

**Contracts:** secret disimpan terenkripsi di Hardhat keystore, bukan di file `.env`:

```bash
cd contracts
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY   # pakai wallet KHUSUS development
npx hardhat keystore set ETHERSCAN_API_KEY
```

## Roadmap

- [x] **M0** Setup monorepo, Hardhat, frontend, CI
- [ ] **M1** Kontrak inti `TaxVerse.sol` + `MockIDR.sol` beserta test
- [ ] **M2** Deploy & verifikasi di Sepolia
- [ ] **M3** Frontend: cek status, bayar pajak, panel petugas
- [ ] **M4** Integrasi Supabase
- [ ] **M5** Polish, demo live, dokumentasi

## Lisensi

[MIT](LICENSE) © 2026 Azzikri AS
