import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Hex } from 'viem'
import { useAccount, usePublicClient, useReadContracts } from 'wagmi'
import { useParams } from 'react-router'

import { FormCekPlat } from '../components/FormCekPlat.tsx'
import { Kartu } from '../components/Kartu.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { contracts, explorerLink, targetChain } from '../config.ts'
import { useSekarang } from '../hooks/useSekarang.ts'
import { taxverseAbi } from '../contracts/generated.ts'
import { alamatPendek, rupiah, selisihHari, tanggal, tanggalJam } from '../lib/format.ts'
import { platValid, tampilkanPlat, vehicleIdDari } from '../lib/plat.ts'

const taxverse = { address: contracts.taxverse, abi: taxverseAbi, chainId: targetChain.id } as const

export function CekPlat() {
  const { plat = '' } = useParams()
  const valid = platValid(plat)
  const id = vehicleIdDari(plat)

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { ...taxverse, functionName: 'statusPajak', args: [id] },
      { ...taxverse, functionName: 'getKendaraan', args: [id] },
      { ...taxverse, functionName: 'hitungTagihan', args: [id] },
    ],
    query: { enabled: valid },
  })

  const status = data?.[0].result
  const terdaftar = status !== undefined && status !== 0

  return (
    <div className="space-y-6 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">Status pajak kendaraan</p>
          <h1 className="mt-1 font-mono text-3xl font-bold tracking-widest">{tampilkanPlat(plat)}</h1>
        </div>
        <div className="sm:w-72">
          <FormCekPlat key={plat} />
        </div>
      </div>

      {!valid && (
        <Kartu>
          <p className="text-slate-300">
            Format nomor plat tidak valid. Contoh yang benar: <span className="font-mono">B 1234 XYZ</span>.
          </p>
        </Kartu>
      )}

      {valid && isLoading && <Kartu className="h-40 animate-pulse">{null}</Kartu>}

      {valid && isError && (
        <Kartu>
          <p className="text-rose-300">Gagal membaca data dari blockchain.</p>
          <button onClick={() => refetch()} className="mt-3 text-sm underline underline-offset-2">
            Coba lagi
          </button>
        </Kartu>
      )}

      {valid && status === 0 && (
        <Kartu>
          <StatusBadge status={0} />
          <p className="mt-4 text-slate-300">
            Kendaraan dengan nomor plat ini belum terdaftar di TaxVerse ({targetChain.name}).
          </p>
        </Kartu>
      )}

      {terdaftar && data?.[1].result && (
        <>
          <RingkasanStatus status={status} kendaraan={data[1].result} />
          {data[2].result && <Tagihan tagihan={data[2].result} />}
          <Riwayat vehicleId={id} />
        </>
      )}
    </div>
  )
}

type Kendaraan = {
  pemilik: `0x${string}`
  berlakuSampai: bigint
  terdaftarPada: bigint
  hashDataPemilik: Hex
}

function RingkasanStatus({ status, kendaraan }: { status: number; kendaraan: Kendaraan }) {
  const { address } = useAccount()
  const sekarang = useSekarang()
  const sisa = selisihHari(kendaraan.berlakuSampai, sekarang)
  const milikSaya = address?.toLowerCase() === kendaraan.pemilik.toLowerCase()

  return (
    <Kartu>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={status} />
        <span className="text-sm text-slate-400">
          {sisa >= 0 ? `Sisa ${sisa} hari` : `Terlambat ${Math.abs(sisa)} hari`}
        </span>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Info label="Berlaku sampai" nilai={tanggal(kendaraan.berlakuSampai)} />
        <Info label="Terdaftar sejak" nilai={tanggal(kendaraan.terdaftarPada)} />
        <Info
          label="Pemilik (wallet)"
          nilai={
            <span className="font-mono">
              {alamatPendek(kendaraan.pemilik)}
              {milikSaya && <span className="ml-2 font-sans text-xs text-cyan-300">(wallet Anda)</span>}
            </span>
          }
        />
        <Info label="Hash data pemilik" nilai={<span className="font-mono">{alamatPendek(kendaraan.hashDataPemilik)}</span>} />
      </dl>
    </Kartu>
  )
}

function Tagihan({ tagihan: [pokok, denda, total] }: { tagihan: readonly [bigint, bigint, bigint] }) {
  return (
    <Kartu>
      <h2 className="font-semibold">Tagihan jika dibayar hari ini</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <Baris label="Pokok pajak" nilai={rupiah(pokok)} />
        <Baris label="Denda keterlambatan" nilai={rupiah(denda)} warna={denda > 0n ? 'text-rose-300' : undefined} />
        <div className="border-t border-white/10 pt-2">
          <Baris label="Total" nilai={rupiah(total)} tebal />
        </div>
      </dl>
    </Kartu>
  )
}

function Riwayat({ vehicleId }: { vehicleId: Hex }) {
  const client = usePublicClient({ chainId: targetChain.id })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['riwayat', targetChain.id, vehicleId],
    enabled: !!client,
    queryFn: async () => {
      const filter = { address: contracts.taxverse, abi: taxverseAbi, args: { vehicleId }, fromBlock: contracts.fromBlock }
      const [daftar, bayar] = await Promise.all([
        client!.getContractEvents({ ...filter, eventName: 'KendaraanDidaftarkan' }),
        client!.getContractEvents({ ...filter, eventName: 'PajakDibayar' }),
      ])
      const semua = [
        ...daftar.map((l) => ({ jenis: 'daftar' as const, log: l, total: l.args.tarif ?? 0n, denda: 0n })),
        ...bayar.map((l) => ({
          jenis: 'bayar' as const,
          log: l,
          total: (l.args.pokok ?? 0n) + (l.args.denda ?? 0n),
          denda: l.args.denda ?? 0n,
        })),
      ].sort((a, b) => Number(b.log.blockNumber - a.log.blockNumber) || b.log.logIndex - a.log.logIndex)

      const nomorBlok = [...new Set(semua.map((e) => e.log.blockNumber))]
      const blok = await Promise.all(nomorBlok.map((n) => client!.getBlock({ blockNumber: n })))
      const waktu = new Map(blok.map((b) => [b.number, b.timestamp]))

      return semua.map((e) => ({ ...e, waktu: waktu.get(e.log.blockNumber) ?? 0n }))
    },
  })

  return (
    <Kartu>
      <h2 className="font-semibold">Riwayat on-chain</h2>
      <p className="mt-1 text-xs text-slate-400">Dibaca langsung dari event kontrak. Tidak bisa diubah oleh siapa pun.</p>

      {isLoading && <p className="mt-4 text-sm text-slate-400">Memuat riwayat…</p>}
      {isError && <p className="mt-4 text-sm text-rose-300">Gagal memuat riwayat.</p>}
      {data?.length === 0 && <p className="mt-4 text-sm text-slate-400">Belum ada riwayat.</p>}

      <ul className="mt-4 divide-y divide-white/5">
        {data?.map((e) => {
          const link = explorerLink('tx', e.log.transactionHash)
          return (
            <li key={`${e.log.transactionHash}-${e.log.logIndex}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {e.jenis === 'bayar' ? 'Pembayaran pajak' : 'Kendaraan didaftarkan'}
                  {e.jenis === 'bayar' && e.denda > 0n && (
                    <span className="ml-2 text-xs text-rose-300">termasuk denda {rupiah(e.denda)}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{tanggalJam(e.waktu)}</p>
              </div>
              <div className="text-right">
                <p className={e.jenis === 'bayar' ? 'font-semibold' : 'text-slate-400'}>
                  {e.jenis === 'bayar' ? rupiah(e.total) : `Tarif ${rupiah(e.total)}/tahun`}
                </p>
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 underline underline-offset-2">
                    Bukti transaksi ↗
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Kartu>
  )
}

function Info({ label, nilai }: { label: string; nilai: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1">{nilai}</dd>
    </div>
  )
}

function Baris({ label, nilai, warna, tebal }: { label: string; nilai: string; warna?: string; tebal?: boolean }) {
  return (
    <div className={`flex justify-between ${tebal ? 'text-base font-semibold' : ''}`}>
      <dt className="text-slate-400">{label}</dt>
      <dd className={warna}>{nilai}</dd>
    </div>
  )
}
