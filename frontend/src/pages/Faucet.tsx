import { useEffect } from 'react'
import { useAccount, useReadContracts, useWatchAsset } from 'wagmi'

import { Kartu } from '../components/Kartu.tsx'
import { TxStatus } from '../components/TxStatus.tsx'
import { WalletGate } from '../components/WalletGate.tsx'
import { contracts, targetChain } from '../config.ts'
import { mockIdrAbi } from '../contracts/generated.ts'
import { useContractTx } from '../hooks/useContractTx.ts'
import { useSekarang } from '../hooks/useSekarang.ts'
import { rupiah, tanggalJam } from '../lib/format.ts'

const mockIdr = { address: contracts.mockIdr, abi: mockIdrAbi, chainId: targetChain.id } as const

export function Faucet() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-bold">Faucet mIDR</h1>
        <p className="mt-2 text-slate-300">
          mIDR adalah token simulasi Rupiah (1 mIDR = Rp1) untuk mencoba bayar pajak. Gratis dan tidak bernilai.
        </p>
      </div>

      <Kartu>
        <WalletGate pesan="Hubungkan wallet untuk mengambil mIDR.">
          <IsiFaucet />
        </WalletGate>
      </Kartu>

      <Kartu>
        <h2 className="font-semibold">Butuh ETH untuk biaya gas?</h2>
        {targetChain.id === 31337 ? (
          <p className="mt-2 text-sm text-slate-300">
            Di blockchain lokal, jalankan <code className="text-cyan-300">npm run seed:local</code> dengan{' '}
            <code className="text-cyan-300">DEV_WALLET</code> berisi alamat wallet-mu.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-300">
            Ambil Sepolia ETH gratis di{' '}
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-300 underline underline-offset-2"
            >
              Google Cloud Web3 Faucet ↗
            </a>
            . Sekitar 0.01 ETH cukup untuk puluhan transaksi.
          </p>
        )}
      </Kartu>
    </div>
  )
}

function IsiFaucet() {
  const { address } = useAccount()
  const tx = useContractTx()
  const { watchAsset } = useWatchAsset()
  const sekarang = useSekarang(5_000)

  const { data, refetch } = useReadContracts({
    contracts: [
      { ...mockIdr, functionName: 'balanceOf', args: [address!] },
      { ...mockIdr, functionName: 'lastFaucetAt', args: [address!] },
      { ...mockIdr, functionName: 'FAUCET_COOLDOWN' },
      { ...mockIdr, functionName: 'FAUCET_AMOUNT' },
    ],
    query: { enabled: !!address },
  })

  useEffect(() => {
    if (tx.status === 'success') refetch()
  }, [tx.status, refetch])

  const [saldo, terakhir, cooldown, jumlah] = data?.map((d) => d.result as bigint | undefined) ?? []
  const bisaLagiPada = terakhir && cooldown ? terakhir + cooldown : 0n
  const siap = bisaLagiPada <= sekarang
  const sibuk = tx.status === 'wallet' || tx.status === 'pending'

  return (
    <div>
      <p className="text-sm text-slate-400">Saldo mIDR kamu</p>
      <p className="mt-1 text-3xl font-bold">{saldo === undefined ? '…' : rupiah(saldo)}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => tx.writeContract({ ...mockIdr, functionName: 'faucet' })}
          disabled={!siap || sibuk}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-40"
        >
          {jumlah ? `Ambil ${rupiah(jumlah)}` : 'Ambil mIDR'}
        </button>
        <button
          onClick={() =>
            watchAsset({ type: 'ERC20', options: { address: contracts.mockIdr, symbol: 'mIDR', decimals: 0 } })
          }
          className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
        >
          Tambahkan mIDR ke wallet
        </button>
      </div>

      {!siap && (
        <p className="mt-3 text-sm text-amber-300">Faucet bisa diambil lagi pada {tanggalJam(bisaLagiPada)}.</p>
      )}

      <TxStatus status={tx.status} hash={tx.hash} error={tx.error} />
    </div>
  )
}
