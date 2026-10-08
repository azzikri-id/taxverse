import { explorerLink } from '../config.ts'
import type { TxStatus as Status } from '../hooks/useContractTx.ts'
import { pesanError } from '../lib/errors.ts'

const TEKS: Record<Exclude<Status, 'idle' | 'error'>, string> = {
  wallet: 'Konfirmasi transaksi di wallet…',
  pending: 'Menunggu transaksi masuk blok…',
  success: 'Transaksi berhasil.',
}

export function TxStatus({ status, hash, error }: { status: Status; hash?: string; error?: unknown }) {
  if (status === 'idle') return null

  const link = hash ? explorerLink('tx', hash) : undefined
  const gaya =
    status === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : status === 'error'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200'

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${gaya}`} role="status">
      <div className="flex items-center gap-2">
        {(status === 'wallet' || status === 'pending') && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        <span>{status === 'error' ? pesanError(error) : TEKS[status]}</span>
      </div>
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-block underline underline-offset-2">
          Lihat di Etherscan ↗
        </a>
      )}
    </div>
  )
}
