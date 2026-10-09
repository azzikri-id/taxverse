import { keccak256, toHex, zeroHash } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'

import { contracts, targetChain } from '../config.ts'
import { taxverseAbi } from '../contracts/generated.ts'

const PETUGAS_ROLE = keccak256(toHex('PETUGAS_ROLE'))
const ADMIN_ROLE = zeroHash

/** Role wallet yang sedang terhubung, dibaca langsung dari kontrak. */
export function useRole() {
  const { address, chainId } = useAccount()
  const base = { address: contracts.taxverse, abi: taxverseAbi, chainId: targetChain.id } as const

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...base, functionName: 'hasRole', args: [ADMIN_ROLE, address!] },
      { ...base, functionName: 'hasRole', args: [PETUGAS_ROLE, address!] },
    ],
    query: { enabled: !!address && chainId === targetChain.id },
  })

  return {
    isAdmin: data?.[0].result === true,
    isPetugas: data?.[1].result === true,
    isLoading,
  }
}
