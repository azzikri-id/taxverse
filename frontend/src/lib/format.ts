const rupiahFormat = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function rupiah(nilai: bigint) {
  return rupiahFormat.format(nilai)
}

export function tanggal(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function tanggalJam(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Selisih hari dari sekarang ke timestamp (keduanya unix detik). Negatif = sudah lewat. */
export function selisihHari(timestamp: bigint, sekarang: bigint) {
  const hari = Number(timestamp - sekarang) / 86_400
  // Bulatkan ke arah nol: sisa 9,5 hari = 9 hari, telat 75,2 hari = 75 hari.
  return Math.trunc(hari)
}

export function alamatPendek(alamat: string) {
  return `${alamat.slice(0, 6)}…${alamat.slice(-4)}`
}
