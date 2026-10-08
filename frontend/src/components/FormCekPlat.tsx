import { useState } from 'react'
import { useNavigate } from 'react-router'

import { normalisasiPlat, platValid } from '../lib/plat.ts'

export function FormCekPlat({ awal = '' }: { awal?: string }) {
  const [plat, setPlat] = useState(awal)
  const navigate = useNavigate()
  const valid = platValid(plat)

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) navigate(`/cek/${normalisasiPlat(plat)}`)
      }}
    >
      <input
        value={plat}
        onChange={(e) => setPlat(e.target.value.toUpperCase())}
        placeholder="B 1234 XYZ"
        aria-label="Nomor plat kendaraan"
        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono tracking-wider outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        disabled={!valid}
        className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
      >
        Cek
      </button>
    </form>
  )
}
