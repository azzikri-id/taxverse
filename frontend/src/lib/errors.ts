import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

/** Pesan error kontrak dalam Bahasa Indonesia, berdasarkan nama custom error di Solidity. */
const PESAN: Record<string, string> = {
  KendaraanTidakTerdaftar: 'Kendaraan belum terdaftar.',
  KendaraanSudahTerdaftar: 'Nomor plat ini sudah terdaftar.',
  KendaraanTidakAktif: 'Kendaraan tidak aktif.',
  FaucetCooldown: 'Faucet hanya bisa diambil sekali per 24 jam.',
  EnforcedPause: 'Sistem sedang dihentikan sementara oleh admin.',
  AccessControlUnauthorizedAccount: 'Wallet ini tidak punya izin untuk aksi tersebut.',
  OwnableUnauthorizedAccount: 'Wallet ini tidak punya izin untuk aksi tersebut.',
  ERC20InsufficientBalance: 'Saldo mIDR tidak cukup.',
  ERC20InsufficientAllowance: 'Izin (approve) mIDR belum cukup.',
  AlamatNol: 'Alamat wallet tidak boleh kosong.',
  TarifNol: 'Tarif tidak boleh nol.',
  HashKosong: 'Data pemilik belum diisi.',
  MasaBerlakuKosong: 'Masa berlaku belum diisi.',
  VehicleIdKosong: 'Nomor plat belum diisi.',
  ParameterDendaTidakValid: 'Parameter denda tidak valid.',
}

export function pesanError(error: unknown): string {
  if (!(error instanceof BaseError)) return 'Terjadi kesalahan. Coba lagi.'

  if (error.walk((e) => e instanceof UserRejectedRequestError)) {
    return 'Transaksi dibatalkan di wallet.'
  }

  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
  if (revert instanceof ContractFunctionRevertedError) {
    const nama = revert.data?.errorName
    if (nama && PESAN[nama]) return PESAN[nama]
  }

  if (/insufficient funds/i.test(error.message)) {
    return 'Saldo ETH tidak cukup untuk biaya gas.'
  }

  // MetaMask "smart account" (EIP-7702) membungkus transaksi lewat kontrak delegasi;
  // jika gagal di dalamnya, alasan revert-nya hilang. Panggilan langsung tetap berhasil.
  if (/unknown reason/i.test(error.message)) {
    return 'Transaksi gagal tanpa alasan yang jelas. Jika memakai MetaMask, coba matikan "Smart account" untuk jaringan ini (Account details → Smart account), lalu ulangi.'
  }

  return error.shortMessage || 'Terjadi kesalahan. Coba lagi.'
}
