import type { Hex } from 'viem'

import { normalisasiPlat, vehicleIdDari } from './plat.ts'

// Kontrak hanya menyimpan hash nomor plat, jadi teks plat tidak bisa dibaca dari blockchain.
// Sementara (sebelum Supabase di M4), browser mengingat plat yang pernah dicek atau didaftarkan.
const KUNCI = 'taxverse:plat-dikenal'

function baca(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KUNCI) ?? '{}')
  } catch {
    return {}
  }
}

export function ingatPlat(plat: string) {
  try {
    const peta = baca()
    peta[vehicleIdDari(plat)] = normalisasiPlat(plat)
    localStorage.setItem(KUNCI, JSON.stringify(peta))
  } catch {
    // localStorage bisa tidak tersedia (mode privat); fitur ini hanya pelengkap.
  }
}

export function platDariId(vehicleId: Hex): string | undefined {
  return baca()[vehicleId]
}
