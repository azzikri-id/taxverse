import { ConnectButton } from '@rainbow-me/rainbowkit'
import type { ReactNode } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'

import { targetChain } from '../config.ts'

/** Tampilkan isi hanya jika wallet terhubung ke jaringan yang benar. */
export function WalletGate({ children, pesan }: { children: ReactNode; pesan?: string }) {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-slate-300">{pesan ?? 'Hubungkan wallet untuk melanjutkan.'}</p>
        <ConnectButton />
      </div>
    )
  }

  if (chainId !== targetChain.id) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-slate-300">
          Wallet terhubung ke jaringan lain. TaxVerse berjalan di <b>{targetChain.name}</b>.
        </p>
        <button
          onClick={() => switchChain({ chainId: targetChain.id })}
          disabled={isPending}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending ? 'Menunggu wallet…' : `Pindah ke ${targetChain.name}`}
        </button>
      </div>
    )
  }

  return <>{children}</>
}
