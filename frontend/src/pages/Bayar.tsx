import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useAccount, useReadContracts } from 'wagmi'

import { Kartu } from '../components/Kartu.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { TxStatus } from '../components/TxStatus.tsx'
import { WalletGate } from '../components/WalletGate.tsx'
import { contracts, targetChain } from '../config.ts'
import { mockIdrAbi, taxverseAbi } from '../contracts/generated.ts'
import { useContractTx } from '../hooks/useContractTx.ts'
import { rupiah, tanggal } from '../lib/format.ts'
import { ingatPlat } from '../lib/platDikenal.ts'
import { platValid, tampilkanPlat, vehicleIdDari } from '../lib/plat.ts'

const taxverse = { address: contracts.taxverse, abi: taxverseAbi, chainId: targetChain.id } as const
const mockIdr = { address: contracts.mockIdr, abi: mockIdrAbi, chainId: targetChain.id } as const
const BPS = 10_000n

export function Bayar() {
  const { plat = '' } = useParams()

  return (
    <div className="space-y-6 pt-8">
      <div>
        <p className="text-sm text-slate-400">Bayar pajak kendaraan</p>
        <h1 className="mt-1 font-mono text-3xl font-bold tracking-widest">{tampilkanPlat(plat)}</h1>
      </div>
      {platValid(plat) ? (
        <WalletGate pesan="Hubungkan wallet untuk membayar pajak.">
          <IsiBayar plat={plat} />
        </WalletGate>
      ) : (
        <Kartu>
          <p className="text-slate-300">Format nomor plat tidak valid.</p>
        </Kartu>
      )}
    </div>
  )
}

function IsiBayar({ plat }: { plat: string }) {
  const { address } = useAccount()
  const id = vehicleIdDari(plat)
  const approve = useContractTx()
  const bayar = useContractTx()

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...taxverse, functionName: 'statusPajak', args: [id] },
      { ...taxverse, functionName: 'getKendaraan', args: [id] },
      { ...taxverse, functionName: 'hitungTagihan', args: [id] },
      { ...taxverse, functionName: 'dendaBpsPerBulan' },
      { ...taxverse, functionName: 'paused' },
      { ...mockIdr, functionName: 'balanceOf', args: [address!] },
      { ...mockIdr, functionName: 'allowance', args: [address!, contracts.taxverse] },
    ],
    query: { enabled: !!address },
  })

  useEffect(() => {
    if (approve.status === 'success' || bayar.status === 'success') refetch()
  }, [approve.status, bayar.status, refetch])

  useEffect(() => {
    if (data?.[0].result) ingatPlat(plat)
  }, [data, plat])

  if (isLoading || !data) return <Kartu className="h-64 animate-pulse">{null}</Kartu>

  const status = data[0].result ?? 0
  if (status === 0) {
    return (
      <Kartu>
        <StatusBadge status={0} />
        <p className="mt-4 text-slate-300">Kendaraan ini belum terdaftar, jadi belum bisa dibayar.</p>
      </Kartu>
    )
  }

  const kendaraan = data[1].result
  const [pokok, denda, total] = data[2].result ?? [0n, 0n, 0n]
  const dendaBps = BigInt(data[3].result ?? 0)
  const dijeda = data[4].result === true
  const saldo = data[5].result ?? 0n
  const izin = data[6].result ?? 0n

  // Denda bisa naik satu bulan jika transaksi masuk blok tepat setelah pergantian bulan,
  // jadi izin (approve) diberi cadangan satu bulan denda. Kontrak hanya menarik jumlah sebenarnya.
  const jumlahApprove = total + (pokok * dendaBps) / BPS
  const izinCukup = izin >= total
  const saldoCukup = saldo >= total
  const milikSendiri = kendaraan?.pemilik.toLowerCase() === address?.toLowerCase()
  const sibuk = [approve.status, bayar.status].some((s) => s === 'wallet' || s === 'pending')
  const lunas = bayar.status === 'success'

  return (
    <>
      <Kartu>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={status} />
          {kendaraan && (
            <span className="text-sm text-slate-400">Berlaku sampai {tanggal(kendaraan.berlakuSampai)}</span>
          )}
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          <Baris label="Pokok pajak (1 tahun)" nilai={rupiah(pokok)} />
          <Baris label="Denda keterlambatan" nilai={rupiah(denda)} warna={denda > 0n ? 'text-rose-300' : undefined} />
          <div className="border-t border-white/10 pt-2">
            <Baris label="Total" nilai={rupiah(total)} tebal />
          </div>
        </dl>
        {!milikSendiri && (
          <p className="mt-4 text-xs text-amber-300">
            Kendaraan ini milik wallet lain. Kamu tetap boleh membayarkannya, dan pemiliknya tidak berubah.
          </p>
        )}
      </Kartu>

      {dijeda && (
        <Kartu>
          <p className="text-amber-300">Sistem sedang dihentikan sementara oleh admin. Pembayaran belum bisa dilakukan.</p>
        </Kartu>
      )}

      {!dijeda && !lunas && (
        <Kartu>
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Pembayaran</h2>
            <span className={`text-sm ${saldoCukup ? 'text-slate-400' : 'text-rose-300'}`}>Saldo: {rupiah(saldo)}</span>
          </div>

          {!saldoCukup ? (
            <p className="mt-4 text-sm text-rose-300">
              Saldo mIDR tidak cukup.{' '}
              <Link to="/faucet" className="underline underline-offset-2">
                Ambil mIDR gratis di faucet →
              </Link>
            </p>
          ) : (
            <ol className="mt-5 space-y-5">
              <Langkah
                nomor={1}
                judul="Izinkan TaxVerse menarik mIDR"
                keterangan={`Approve ${rupiah(jumlahApprove)} (termasuk cadangan jika denda naik). Kontrak hanya menarik jumlah tagihan sebenarnya.`}
                selesai={izinCukup}
              >
                {!izinCukup && (
                  <>
                    <button
                      onClick={() =>
                        approve.writeContract({ ...mockIdr, functionName: 'approve', args: [contracts.taxverse, jumlahApprove] })
                      }
                      disabled={sibuk}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <TxStatus status={approve.status} hash={approve.hash} error={approve.error} />
                  </>
                )}
              </Langkah>

              <Langkah
                nomor={2}
                judul="Bayar pajak"
                keterangan="Token dikirim ke kas dan masa berlaku diperpanjang 1 tahun."
                selesai={false}
              >
                <button
                  onClick={() => bayar.writeContract({ ...taxverse, functionName: 'bayarPajak', args: [id] })}
                  disabled={!izinCukup || sibuk}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold transition hover:bg-emerald-500 disabled:opacity-40"
                >
                  Bayar {rupiah(total)}
                </button>
                <TxStatus status={bayar.status} hash={bayar.hash} error={bayar.error} />
              </Langkah>
            </ol>
          )}
        </Kartu>
      )}

      {lunas && (
        <Kartu className="border-emerald-500/30">
          <p className="text-lg font-semibold text-emerald-300">✅ Pajak berhasil dibayar</p>
          <p className="mt-2 text-sm text-slate-300">
            Bukti pembayaran tercatat permanen di blockchain.
            {kendaraan && <> Masa berlaku baru: {tanggal(kendaraan.berlakuSampai)}.</>}
          </p>
          <TxStatus status={bayar.status} hash={bayar.hash} error={bayar.error} />
          <Link to={`/cek/${plat}`} className="mt-4 inline-block text-indigo-300 underline underline-offset-2">
            Lihat status dan riwayat →
          </Link>
        </Kartu>
      )}
    </>
  )
}

function Langkah({
  nomor,
  judul,
  keterangan,
  selesai,
  children,
}: {
  nomor: number
  judul: string
  keterangan: string
  selesai: boolean
  children: ReactNode
}) {
  return (
    <li className="flex gap-4">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          selesai ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-300'
        }`}
      >
        {selesai ? '✓' : nomor}
      </span>
      <div className="flex-1">
        <p className="font-medium">{judul}</p>
        <p className="mt-0.5 text-xs text-slate-400">{keterangan}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
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
