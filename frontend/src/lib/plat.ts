import { keccak256, toHex } from 'viem'

/** "b 1234-xyz" -> "B1234XYZ". Harus sama persis dengan normalisasi saat pendaftaran. */
export function normalisasiPlat(plat: string) {
  return plat.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const POLA_PLAT = /^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/

/** Format plat Indonesia: 1–2 huruf wilayah, 1–4 angka, 0–3 huruf seri. */
export function platValid(plat: string) {
  return POLA_PLAT.test(normalisasiPlat(plat))
}

/** "B1234XYZ" -> "B 1234 XYZ" */
export function tampilkanPlat(plat: string) {
  const m = normalisasiPlat(plat).match(POLA_PLAT)
  return m ? [m[1], m[2], m[3]].filter(Boolean).join(' ') : plat.toUpperCase()
}

/** ID kendaraan on-chain = keccak256(plat ternormalisasi). */
export function vehicleIdDari(plat: string) {
  return keccak256(toHex(normalisasiPlat(plat)))
}
