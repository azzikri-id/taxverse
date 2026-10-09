import { keccak256, toHex } from 'viem'

import { normalisasiPlat } from './plat.ts'

export type DataPemilik = {
  plat: string
  nama: string
  nik: string
}

/**
 * Data pribadi pemilik dalam bentuk kanonik (urutan field tetap, sudah dinormalisasi),
 * supaya hash-nya selalu sama untuk data yang sama.
 */
export function kanonikPemilik({ plat, nama, nik }: DataPemilik) {
  return JSON.stringify({
    plat: normalisasiPlat(plat),
    nama: nama.trim().replace(/\s+/g, ' ').toUpperCase(),
    nik: nik.replace(/\D/g, ''),
  })
}

/** Hash yang disimpan on-chain. Data aslinya TIDAK pernah dikirim ke blockchain. */
export function hashPemilik(data: DataPemilik) {
  return keccak256(toHex(kanonikPemilik(data)))
}

export function nikValid(nik: string) {
  return /^\d{16}$/.test(nik.replace(/\D/g, ''))
}
