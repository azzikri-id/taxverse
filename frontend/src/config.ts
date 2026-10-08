import { hardhat, sepolia } from 'wagmi/chains'

import { deployments } from './contracts/generated.ts'

const chains = { sepolia, hardhat } as const

/** Jaringan yang dipakai aplikasi. Atur lewat VITE_CHAIN di .env.local. */
export const targetChain = chains[import.meta.env.VITE_CHAIN ?? 'sepolia'] ?? sepolia

/** Alamat kontrak di jaringan target. */
export const contracts = deployments[targetChain.id]

export const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

/** Link block explorer untuk transaksi/alamat. Kosong di jaringan lokal. */
export function explorerLink(type: 'tx' | 'address', value: string) {
  const base = targetChain.blockExplorers?.default.url
  return base ? `${base}/${type}/${value}` : undefined
}
