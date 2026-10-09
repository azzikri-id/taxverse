import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { isAddress, keccak256, toHex, type Address } from 'viem'
import { useAccount, usePublicClient, useReadContracts } from 'wagmi'

import { Field } from '../components/Field.tsx'
import { Kartu } from '../components/Kartu.tsx'
import { TxStatus } from '../components/TxStatus.tsx'
import { WalletGate } from '../components/WalletGate.tsx'
import { contracts, explorerLink, targetChain } from '../config.ts'
import { taxverseAbi } from '../contracts/generated.ts'
import { useContractTx } from '../hooks/useContractTx.ts'
import { useRole } from '../hooks/useRole.ts'
import { alamatPendek, rupiah } from '../lib/format.ts'

const taxverse = { address: contracts.taxverse, abi: taxverseAbi, chainId: targetChain.id } as const
const PETUGAS_ROLE = keccak256(toHex('PETUGAS_ROLE'))
const persen = (bps: number) => `${(bps / 100).toLocaleString('id-ID')}%`

export function Admin() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-bold">Panel Admin</h1>
        <p className="mt-2 text-slate-300">Kelola petugas, aturan denda, kas, dan status sistem.</p>
      </div>
      <WalletGate pesan="Hubungkan wallet admin untuk membuka panel ini.">
        <IsiAdmin />
      </WalletGate>
    </div>
  )
}

function IsiAdmin() {
  const { isAdmin, isLoading } = useRole()

  if (isLoading) return <Kartu className="h-40 animate-pulse">{null}</Kartu>
  if (!isAdmin) {
    return (
      <Kartu>
        <p className="text-slate-300">
          Wallet ini tidak memiliki role <b>admin</b>.
        </p>
      </Kartu>
    )
  }

  return (
    <>
      <Statistik />
      <StatusSistem />
      <KelolaPetugas />
      <AturanDenda />
      <Kas />
    </>
  )
}

/** Ringkasan penerimaan, dihitung dari event on-chain. */
function Statistik() {
  const client = usePublicClient({ chainId: targetChain.id })
  const { data } = useQuery({
    queryKey: ['statistik', targetChain.id],
    enabled: !!client,
    queryFn: async () => {
      const filter = { address: contracts.taxverse, abi: taxverseAbi, fromBlock: contracts.fromBlock }
      const [daftar, bayar] = await Promise.all([
        client!.getContractEvents({ ...filter, eventName: 'KendaraanDidaftarkan' }),
        client!.getContractEvents({ ...filter, eventName: 'PajakDibayar' }),
      ])
      return {
        kendaraan: daftar.length,
        pembayaran: bayar.length,
        pokok: bayar.reduce((t, l) => t + (l.args.pokok ?? 0n), 0n),
        denda: bayar.reduce((t, l) => t + (l.args.denda ?? 0n), 0n),
      }
    },
  })

  const item = [
    ['Kendaraan terdaftar', data?.kendaraan.toLocaleString('id-ID')],
    ['Pembayaran', data?.pembayaran.toLocaleString('id-ID')],
    ['Pajak diterima', data && rupiah(data.pokok)],
    ['Denda diterima', data && rupiah(data.denda)],
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {item.map(([label, nilai]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-bold">{nilai ?? '…'}</p>
        </div>
      ))}
    </div>
  )
}

function StatusSistem() {
  const tx = useContractTx()
  const { data, refetch } = useReadContracts({ contracts: [{ ...taxverse, functionName: 'paused' }] })
  const dijeda = data?.[0].result === true
  const sibuk = tx.status === 'wallet' || tx.status === 'pending'

  useEffect(() => {
    if (tx.status === 'success') refetch()
  }, [tx.status, refetch])

  return (
    <Kartu>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Status sistem</h2>
          <p className={`mt-1 text-sm ${dijeda ? 'text-amber-300' : 'text-emerald-300'}`}>
            {dijeda
              ? '⏸ Dihentikan: pendaftaran, ubah tarif, dan pembayaran ditolak.'
              : '● Berjalan normal'}
          </p>
        </div>
        <button
          onClick={() => tx.writeContract({ ...taxverse, functionName: dijeda ? 'unpause' : 'pause' })}
          disabled={sibuk || data === undefined}
          className={`rounded-xl px-5 py-2.5 font-semibold transition disabled:opacity-40 ${
            dijeda ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
          }`}
        >
          {dijeda ? 'Jalankan lagi' : 'Hentikan sementara'}
        </button>
      </div>
      <TxStatus status={tx.status} hash={tx.hash} error={tx.error} />
    </Kartu>
  )
}

function KelolaPetugas() {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: targetChain.id })
  const beri = useContractTx()
  const cabut = useContractTx()
  const [alamat, setAlamat] = useState('')

  // Daftar petugas dibangun ulang dari event RoleGranted/RoleRevoked (AccessControl).
  const { data: petugas, refetch } = useQuery({
    queryKey: ['petugas', targetChain.id],
    enabled: !!client,
    queryFn: async () => {
      const filter = {
        address: contracts.taxverse,
        abi: taxverseAbi,
        args: { role: PETUGAS_ROLE },
        fromBlock: contracts.fromBlock,
      }
      const [diberi, dicabut] = await Promise.all([
        client!.getContractEvents({ ...filter, eventName: 'RoleGranted' }),
        client!.getContractEvents({ ...filter, eventName: 'RoleRevoked' }),
      ])
      const urut = [...diberi.map((l) => ({ l, aktif: true })), ...dicabut.map((l) => ({ l, aktif: false }))].sort(
        (a, b) => Number(a.l.blockNumber - b.l.blockNumber) || a.l.logIndex - b.l.logIndex,
      )
      const status = new Map<Address, boolean>()
      for (const { l, aktif } of urut) if (l.args.account) status.set(l.args.account, aktif)
      return [...status].filter(([, aktif]) => aktif).map(([a]) => a)
    },
  })

  useEffect(() => {
    if (beri.status === 'success' || cabut.status === 'success') refetch()
  }, [beri.status, cabut.status, refetch])

  const sibuk = [beri.status, cabut.status].some((s) => s === 'wallet' || s === 'pending')
  const sudahPetugas = isAddress(alamat) && petugas?.some((p) => p.toLowerCase() === alamat.toLowerCase())

  return (
    <Kartu>
      <h2 className="text-lg font-semibold">Petugas</h2>

      <ul className="mt-4 divide-y divide-white/5">
        {petugas === undefined && <li className="py-2 text-sm text-slate-400">Memuat…</li>}
        {petugas?.map((p) => {
          const link = explorerLink('address', p)
          return (
            <li key={p} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-mono">
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer" className="hover:underline">
                    {alamatPendek(p)}
                  </a>
                ) : (
                  alamatPendek(p)
                )}
                {p.toLowerCase() === address?.toLowerCase() && (
                  <span className="ml-2 font-sans text-xs text-cyan-300">(Anda)</span>
                )}
              </span>
              <button
                onClick={() => cabut.writeContract({ ...taxverse, functionName: 'revokeRole', args: [PETUGAS_ROLE, p] })}
                disabled={sibuk}
                className="text-xs text-rose-300 hover:underline disabled:opacity-40"
              >
                Cabut
              </button>
            </li>
          )
        })}
      </ul>
      <TxStatus status={cabut.status} hash={cabut.hash} error={cabut.error} />

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (isAddress(alamat) && !sudahPetugas) {
            beri.writeContract({ ...taxverse, functionName: 'grantRole', args: [PETUGAS_ROLE, alamat] })
          }
        }}
      >
        <div className="flex-1">
          <Field
            label="Tambah petugas"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value.trim())}
            placeholder="0x… alamat wallet"
            className="font-mono text-sm"
            error={(alamat && !isAddress(alamat) && 'Alamat tidak valid') || (sudahPetugas && 'Sudah menjadi petugas')}
          />
        </div>
        <button
          type="submit"
          disabled={!isAddress(alamat) || sudahPetugas || sibuk}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
        >
          Beri role petugas
        </button>
      </form>
      <TxStatus status={beri.status} hash={beri.hash} error={beri.error} />
    </Kartu>
  )
}

function AturanDenda() {
  const tx = useContractTx()
  const { data, refetch } = useReadContracts({
    contracts: [
      { ...taxverse, functionName: 'dendaBpsPerBulan' },
      { ...taxverse, functionName: 'dendaMaksBps' },
    ],
  })
  const [perBulan, setPerBulan] = useState('')
  const [maks, setMaks] = useState('')

  useEffect(() => {
    if (tx.status === 'success') refetch()
  }, [tx.status, refetch])

  const sekarangPerBulan = data?.[0].result
  const sekarangMaks = data?.[1].result

  // Input dalam persen (boleh desimal, mis. 1,5) -> basis point
  const keBps = (v: string) => Math.round(parseFloat(v.replace(',', '.')) * 100)
  const bpsPerBulan = keBps(perBulan)
  const bpsMaks = keBps(maks)
  const valid =
    Number.isFinite(bpsPerBulan) &&
    Number.isFinite(bpsMaks) &&
    bpsPerBulan >= 0 &&
    bpsMaks <= 10_000 &&
    bpsPerBulan <= bpsMaks
  const sibuk = tx.status === 'wallet' || tx.status === 'pending'

  return (
    <Kartu>
      <h2 className="text-lg font-semibold">Aturan denda</h2>
      <p className="mt-1 text-sm text-slate-400">
        Sekarang:{' '}
        {sekarangPerBulan !== undefined && sekarangMaks !== undefined
          ? `${persen(sekarangPerBulan)} per bulan keterlambatan, maksimal ${persen(sekarangMaks)}`
          : '…'}
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) tx.writeContract({ ...taxverse, functionName: 'setParameterDenda', args: [bpsPerBulan, bpsMaks] })
        }}
      >
        <Field
          label="Denda per bulan (%)"
          value={perBulan}
          onChange={(e) => setPerBulan(e.target.value)}
          inputMode="decimal"
          placeholder="2"
        />
        <Field
          label="Maksimal (%)"
          value={maks}
          onChange={(e) => setMaks(e.target.value)}
          inputMode="decimal"
          placeholder="48"
          error={perBulan && maks && !valid && 'Maksimal ≤ 100% dan tidak lebih kecil dari denda per bulan'}
        />
        <button
          type="submit"
          disabled={!valid || sibuk}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
        >
          Simpan
        </button>
      </form>
      <TxStatus status={tx.status} hash={tx.hash} error={tx.error} />
    </Kartu>
  )
}

function Kas() {
  const tx = useContractTx()
  const { data, refetch } = useReadContracts({ contracts: [{ ...taxverse, functionName: 'kas' }] })
  const [alamat, setAlamat] = useState('')

  useEffect(() => {
    if (tx.status === 'success') refetch()
  }, [tx.status, refetch])

  const kas = data?.[0].result
  const linkKas = kas ? explorerLink('address', kas) : undefined
  const sama = isAddress(alamat) && kas?.toLowerCase() === alamat.toLowerCase()
  const sibuk = tx.status === 'wallet' || tx.status === 'pending'

  return (
    <Kartu>
      <h2 className="text-lg font-semibold">Kas penerima pajak</h2>
      <p className="mt-1 text-sm text-slate-400">
        Sekarang:{' '}
        {kas ? (
          linkKas ? (
            <a href={linkKas} target="_blank" rel="noreferrer" className="font-mono hover:underline">
              {kas}
            </a>
          ) : (
            <span className="font-mono">{kas}</span>
          )
        ) : (
          '…'
        )}
      </p>
      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (isAddress(alamat) && !sama) tx.writeContract({ ...taxverse, functionName: 'setKas', args: [alamat] })
        }}
      >
        <div className="flex-1">
          <Field
            label="Alamat kas baru"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value.trim())}
            placeholder="0x…"
            className="font-mono text-sm"
            error={(alamat && !isAddress(alamat) && 'Alamat tidak valid') || (sama && 'Sama dengan kas sekarang')}
          />
        </div>
        <button
          type="submit"
          disabled={!isAddress(alamat) || sama || sibuk}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
        >
          Ganti kas
        </button>
      </form>
      <TxStatus status={tx.status} hash={tx.hash} error={tx.error} />
    </Kartu>
  )
}
