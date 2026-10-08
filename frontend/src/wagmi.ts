import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { hardhat, sepolia } from 'wagmi/chains'

import { sepoliaRpcUrl, targetChain } from './config.ts'

// Project ID gratis dari https://cloud.reown.com (dibutuhkan untuk WalletConnect).
// MetaMask di browser tetap bisa dipakai walaupun nilai ini belum diisi.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'taxverse-dev'

export const config = getDefaultConfig({
  appName: 'TaxVerse',
  projectId,
  chains: [targetChain],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
    [hardhat.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
