import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { hardhat, sepolia } from 'wagmi/chains'

// Project ID gratis dari https://cloud.reown.com (dibutuhkan untuk WalletConnect).
// MetaMask di browser tetap bisa dipakai walaupun nilai ini belum diisi.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'taxverse-dev'

export const config = getDefaultConfig({
  appName: 'TaxVerse',
  projectId,
  chains: import.meta.env.DEV ? [hardhat, sepolia] : [sepolia],
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
