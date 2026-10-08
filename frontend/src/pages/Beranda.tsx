import { FormCekPlat } from '../components/FormCekPlat.tsx'

export function Beranda() {
  return (
    <div className="pt-16 text-center">
      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
        Testnet · Simulasi
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
        Pajak kendaraan yang{' '}
        <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">transparan</span>.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-300">
        Cek status pajak kendaraan dari nomor polisi. Bukti pembayaran tercatat di blockchain, tidak bisa dipalsukan,
        dan bisa diverifikasi siapa saja. Tanpa login, tanpa wallet.
      </p>
      <div className="mx-auto mt-10 max-w-md">
        <FormCekPlat />
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        {[
          ['🔍', 'Cek publik', 'Siapa pun bisa memverifikasi status pajak hanya dari nomor plat.'],
          ['⛓️', 'Tercatat permanen', 'Setiap pembayaran menjadi event di blockchain yang tidak bisa diubah.'],
          ['🔒', 'Privasi terjaga', 'Data pribadi pemilik tidak disimpan di blockchain, hanya hash-nya.'],
        ].map(([ikon, judul, isi]) => (
          <div key={judul} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <div className="text-2xl">{ikon}</div>
            <h3 className="mt-2 font-semibold">{judul}</h3>
            <p className="mt-1 text-sm text-slate-400">{isi}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
