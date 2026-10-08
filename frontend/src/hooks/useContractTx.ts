import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

import { targetChain } from '../config.ts'

export type TxStatus = 'idle' | 'wallet' | 'pending' | 'success' | 'error'

/** Kirim transaksi ke kontrak dan pantau statusnya sampai masuk blok. */
export function useContractTx() {
  const write = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: targetChain.id })

  let status: TxStatus = 'idle'
  if (write.isPending) status = 'wallet'
  else if (write.error || receipt.error) status = 'error'
  else if (write.data && receipt.isLoading) status = 'pending'
  else if (receipt.data) status = receipt.data.status === 'success' ? 'success' : 'error'

  return {
    writeContract: write.writeContract,
    writeContractAsync: write.writeContractAsync,
    hash: write.data,
    receipt: receipt.data,
    error: write.error ?? receipt.error,
    status,
    reset: write.reset,
  }
}
