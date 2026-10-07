import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState } from 'react'

// Halaman awal sementara (M0). Fitur cek status pajak akan terhubung ke kontrak di M3.
export default function App() {
  const [plat, setPlat] = useState('')

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#312e81_0%,_#020617_60%)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-lg font-bold">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          TaxVerse
        </div>
        <ConnectButton showBalance={false} />
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-20 pb-24 text-center">
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
          Testnet · Simulasi
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Pajak kendaraan yang{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
            transparan
          </span>
          .
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Cek status pajak kendaraan dari nomor polisi. Bukti pembayaran tercatat di blockchain, tidak bisa
          dipalsukan, dan bisa diverifikasi siapa saja.
        </p>

        <form
          className="mx-auto mt-10 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            alert(`Fitur cek status untuk "${plat}" akan tersedia di milestone M3.`)
          }}
        >
          <input
            value={plat}
            onChange={(e) => setPlat(e.target.value.toUpperCase())}
            placeholder="B 1234 XYZ"
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono tracking-wider outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!plat.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Cek
          </button>
        </form>
      </main>
    </div>
  )
}
