import { useEffect, useState } from 'react'

const detikSekarang = () => BigInt(Math.floor(Date.now() / 1000))

/** Waktu sekarang (unix detik), diperbarui berkala supaya hitung mundur tetap akurat. */
export function useSekarang(intervalMs = 30_000) {
  const [sekarang, setSekarang] = useState(detikSekarang)

  useEffect(() => {
    const id = setInterval(() => setSekarang(detikSekarang()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return sekarang
}
