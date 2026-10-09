import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAddress } from 'viem'
import { useAccount, useReadContract } from 'wagmi'

import { Field } from '../components/Field.tsx'
import { Kartu } from '../components/Kartu.tsx'
import { TxStatus } from '../components/TxStatus.tsx'
import { WalletGate } from '../components/WalletGate.tsx'
import { contracts, targetChain } from '../config.ts'
import { taxverseAbi } from '../contracts/generated.ts'
import { useContractTx } from '../hooks/useContractTx.ts'
import { useRole } from '../hooks/useRole.ts'
import { rupiah } from '../lib/format.ts'
import { hashPemilik, nikValid } from '../lib/pemilik.ts'
import { normalisasiPlat, platValid, tampilkanPlat, vehicleIdDari } from '../lib/plat.ts'

const taxverse = { address: contracts.taxverse, abi: taxverseAbi, chainId: targetChain.id } as const

const angkaSaja = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '')

/** yyyy-mm-dd untuk input tanggal, `hari` dari sekarang. */
function tanggalInput(hari: number) {
  const d = new Date()
  d.setDate(d.getDate() + hari)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Akhir hari (23:59:59 waktu lokal) dalam unix detik. */
const akhirHari = (yyyyMmDd: string) => BigInt(Math.floor(new Date(`${yyyyMmDd}T23:59:59`).getTime() / 1000))

export function Petugas() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-bold">Panel Petugas</h1>
        <p className="mt-2 text-slate-300">Daftarkan kendaraan baru dan kelola tarif pajak.</p>
      </div>
      <WalletGate pesan="Hubungkan wallet petugas untuk membuka panel ini.">
        <IsiPetugas />
      </WalletGate>
    </div>
  )
}

function IsiPetugas() {
  const { isPetugas, isLoading } = useRole()

  if (isLoading) return <Kartu className="h-40 animate-pulse">{null}</Kartu>
  if (!isPetugas) {
    return (
      <Kartu>
        <p className="text-slate-300">
          Wallet ini tidak memiliki role <b>petugas</b>. Minta admin memberikan role petugas ke alamat wallet-mu.
        </p>
      </Kartu>
    )
  }

  return (
    <>
      <FormDaftar />
      <FormUbahTarif />
    </>
  )
}

function FormDaftar() {
  const { address } = useAccount()
  const tx = useContractTx()
  const [plat, setPlat] = useState('')
  const [pemilik, setPemilik] = useState('')
  const [nama, setNama] = useState('')
  const [nik, setNik] = useState('')
  const [tarif, setTarif] = useState('2500000')
  const [berlaku, setBerlaku] = useState(() => tanggalInput(365))
  const [platTerkirim, setPlatTerkirim] = useState('')

  const id = vehicleIdDari(plat)
  const { data: statusSekarang, refetch: refetchStatus } = useReadContract({
    ...taxverse,
    functionName: 'statusPajak',
    args: [id],
    query: { enabled: platValid(plat) },
  })
  const sudahTerdaftar = statusSekarang !== undefined && statusSekarang !== 0
  // Plat yang barusan berhasil kita daftarkan memang "sudah terdaftar", tapi itu bukan error.
  const baruDidaftarkan = tx.status === 'success' && normalisasiPlat(plat) === platTerkirim

  useEffect(() => {
    if (tx.status === 'success') refetchStatus()
  }, [tx.status, refetchStatus])

  const error = {
    plat: plat && !platValid(plat) && 'Format plat tidak valid, contoh: B 1234 XYZ',
    pemilik: pemilik && !isAddress(pemilik) && 'Alamat wallet tidak valid',
    nik: nik && !nikValid(nik) && 'NIK harus 16 digit angka',
  }
  const lengkap =
    platValid(plat) && isAddress(pemilik) && nama.trim() && nikValid(nik) && BigInt(tarif || 0) > 0n && berlaku
  const sibuk = tx.status === 'wallet' || tx.status === 'pending'

  function kirim() {
    if (!lengkap || sudahTerdaftar || !isAddress(pemilik)) return
    setPlatTerkirim(normalisasiPlat(plat))
    tx.writeContract({
      ...taxverse,
      functionName: 'daftarKendaraan',
      args: [id, pemilik, hashPemilik({ plat, nama, nik }), BigInt(tarif), akhirHari(berlaku)],
    })
  }

  function formBaru() {
    setPlat('')
    setPemilik('')
    setNama('')
    setNik('')
    tx.reset()
  }

  return (
    <Kartu>
      <h2 className="text-lg font-semibold">Daftarkan kendaraan</h2>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          kirim()
        }}
      >
        <Field
          label="Nomor plat"
          value={plat}
          onChange={(e) => setPlat(e.target.value.toUpperCase())}
          placeholder="B 1234 XYZ"
          className="font-mono tracking-wider"
          error={error.plat || (sudahTerdaftar && !baruDidaftarkan && 'Plat ini sudah terdaftar')}
          bantuan={
            baruDidaftarkan
              ? '✅ Berhasil didaftarkan'
              : platValid(plat)
                ? `Disimpan sebagai ${tampilkanPlat(plat)}`
                : undefined
          }
        />
        <Field
          label="Wallet pemilik"
          value={pemilik}
          onChange={(e) => setPemilik(e.target.value.trim())}
          placeholder="0x…"
          className="font-mono text-sm"
          error={error.pemilik}
          aksi={
            address && (
              <button type="button" onClick={() => setPemilik(address)} className="text-xs text-indigo-300 hover:underline">
                Pakai wallet saya
              </button>
            )
          }
        />
        <Field label="Nama pemilik" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Budi Santoso" />
        <Field
          label="NIK"
          value={nik}
          onChange={(e) => setNik(angkaSaja(e.target.value).slice(0, 16))}
          inputMode="numeric"
          placeholder="16 digit"
          className="font-mono"
          error={error.nik}
        />
        <Field
          label="Tarif pajak per tahun (mIDR)"
          value={tarif}
          onChange={(e) => setTarif(angkaSaja(e.target.value))}
          inputMode="numeric"
          bantuan={tarif ? rupiah(BigInt(tarif)) : undefined}
        />
        <Field
          label="Pajak berlaku sampai"
          type="date"
          value={berlaku}
          onChange={(e) => setBerlaku(e.target.value)}
          bantuan="Boleh tanggal lampau untuk kendaraan yang pajaknya sudah telat."
        />

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-cyan-200 sm:col-span-2">
          🔒 Nama dan NIK <b>tidak dikirim ke blockchain</b>. Yang disimpan on-chain hanya hash-nya, sebagai bukti
          integritas data.
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!lengkap || sudahTerdaftar || sibuk}
            className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Daftarkan kendaraan
          </button>
          <TxStatus status={tx.status} hash={tx.hash} error={tx.error} />
          {tx.status === 'success' && (
            <div className="mt-3 flex gap-4 text-sm">
              <Link to={`/cek/${platTerkirim}`} className="text-indigo-300 underline underline-offset-2">
                Lihat status {tampilkanPlat(platTerkirim)} →
              </Link>
              <button type="button" onClick={formBaru} className="text-slate-400 hover:text-white">
                Daftarkan kendaraan lain
              </button>
            </div>
          )}
        </div>
      </form>
    </Kartu>
  )
}

function FormUbahTarif() {
  const tx = useContractTx()
  const [plat, setPlat] = useState('')
  const [tarif, setTarif] = useState('')

  const id = vehicleIdDari(plat)
  const { data: kendaraan, refetch } = useReadContract({
    ...taxverse,
    functionName: 'getKendaraan',
    args: [id],
    query: { enabled: platValid(plat) },
  })
  const terdaftar = !!kendaraan && kendaraan.terdaftarPada > 0n
  const sibuk = tx.status === 'wallet' || tx.status === 'pending'

  useEffect(() => {
    if (tx.status === 'success') refetch()
  }, [tx.status, refetch])

  return (
    <Kartu>
      <h2 className="text-lg font-semibold">Ubah tarif</h2>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (terdaftar && BigInt(tarif || 0) > 0n) {
            tx.writeContract({ ...taxverse, functionName: 'ubahTarif', args: [id, BigInt(tarif)] })
          }
        }}
      >
        <Field
          label="Nomor plat"
          value={plat}
          onChange={(e) => {
            setPlat(e.target.value.toUpperCase())
            tx.reset()
          }}
          placeholder="B 1234 XYZ"
          className="font-mono tracking-wider"
          error={platValid(plat) && kendaraan && !terdaftar && 'Plat belum terdaftar'}
          bantuan={terdaftar ? `Tarif sekarang: ${rupiah(kendaraan.tarifTahunan)}` : undefined}
        />
        <Field
          label="Tarif baru (mIDR)"
          value={tarif}
          onChange={(e) => setTarif(angkaSaja(e.target.value))}
          inputMode="numeric"
          bantuan={tarif ? rupiah(BigInt(tarif)) : undefined}
        />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!terdaftar || !(BigInt(tarif || 0) > 0n) || sibuk}
            className="w-full rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:bg-white/5 disabled:opacity-40"
          >
            Simpan tarif baru
          </button>
          <TxStatus status={tx.status} hash={tx.hash} error={tx.error} />
        </div>
      </form>
    </Kartu>
  )
}
