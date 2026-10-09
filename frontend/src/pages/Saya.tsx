import { useQuery } from '@tanstack/react-query'
import type { Hex } from 'viem'
import { Link } from 'react-router'
import { useAccount, usePublicClient, useReadContracts } from 'wagmi'

import { Kartu } from '../components/Kartu.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { WalletGate } from '../components/WalletGate.tsx'
import { contracts, targetChain } from '../config.ts'
import { taxverseAbi } from '../contracts/generated.ts'
import { alamatPendek, rupiah, tanggal } from '../lib/format.ts'
import { platDariId } from '../lib/platDikenal.ts'
import { tampilkanPlat } from '../lib/plat.ts'

const taxverse = { address: contracts.taxverse, abi: taxverseAbi, chainId: targetChain.id } as const

export function Saya() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-bold">Kendaraan Saya</h1>
        <p className="mt-2 text-slate-300">Kendaraan yang terdaftar atas nama wallet yang sedang terhubung.</p>
      </div>
      <WalletGate pesan="Hubungkan wallet untuk melihat kendaraanmu.">
        <DaftarKendaraan />
      </WalletGate>
    </div>
  )
}

function DaftarKendaraan() {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: targetChain.id })

  // Kontrak tidak menyimpan daftar kendaraan per pemilik, jadi daftarnya dibangun
  // dari event KendaraanDidaftarkan yang memfilter `pemilik` (field indexed).
  const { data: ids, isLoading, isError } = useQuery({
    queryKey: ['kendaraan-saya', targetChain.id, address],
    enabled: !!client && !!address,
    queryFn: async () => {
      const logs = await client!.getContractEvents({
        address: contracts.taxverse,
        abi: taxverseAbi,
        eventName: 'KendaraanDidaftarkan',
        args: { pemilik: address },
        fromBlock: contracts.fromBlock,
      })
      return [...new Set(logs.map((l) => l.args.vehicleId).filter((id): id is Hex => !!id))]
    },
  })

  if (isLoading) return <Kartu className="h-32 animate-pulse">{null}</Kartu>
  if (isError) return <Kartu><p className="text-rose-300">Gagal membaca data dari blockchain.</p></Kartu>
  if (!ids?.length) {
    return (
      <Kartu>
        <p className="text-slate-300">Belum ada kendaraan yang terdaftar atas nama wallet ini.</p>
      </Kartu>
    )
  }

  return (
    <div className="space-y-3">
      {ids.map((id) => (
        <BarisKendaraan key={id} vehicleId={id} />
      ))}
      <p className="text-xs text-slate-500">
        Nomor plat yang tidak dikenali: blockchain hanya menyimpan hash plat. Cek platnya sekali lewat menu Cek Pajak
        supaya browser ini mengingatnya. Mulai M4, nomor plat akan diambil dari database.
      </p>
    </div>
  )
}

function BarisKendaraan({ vehicleId }: { vehicleId: Hex }) {
  const { address } = useAccount()
  const plat = platDariId(vehicleId)

  const { data } = useReadContracts({
    contracts: [
      { ...taxverse, functionName: 'getKendaraan', args: [vehicleId] },
      { ...taxverse, functionName: 'statusPajak', args: [vehicleId] },
      { ...taxverse, functionName: 'hitungTagihan', args: [vehicleId] },
    ],
  })

  const kendaraan = data?.[0].result
  const status = data?.[1].result
  const total = data?.[2].result?.[2]

  // Sudah dipindah ke pemilik lain (balik nama) -> tidak ditampilkan
  if (kendaraan && kendaraan.pemilik.toLowerCase() !== address?.toLowerCase()) return null

  return (
    <Kartu className="flex flex-wrap items-center justify-between gap-4 !p-5">
      <div>
        <p className={plat ? 'font-mono text-xl font-bold tracking-widest' : 'font-mono text-sm text-slate-400'}>
          {plat ? tampilkanPlat(plat) : `Plat tidak dikenali (${alamatPendek(vehicleId)})`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {status !== undefined && <StatusBadge status={status} />}
          {kendaraan && <span>Berlaku sampai {tanggal(kendaraan.berlakuSampai)}</span>}
        </div>
      </div>
      {plat && (
        <div className="flex items-center gap-3">
          <Link to={`/cek/${plat}`} className="text-sm text-slate-300 hover:text-white">
            Detail
          </Link>
          <Link
            to={`/bayar/${plat}`}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500"
          >
            Bayar{total !== undefined && ` ${rupiah(total)}`}
          </Link>
        </div>
      )}
    </Kartu>
  )
}
