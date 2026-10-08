interface ImportMetaEnv {
  /** Jaringan target: "sepolia" (default) atau "hardhat" untuk blockchain lokal. */
  readonly VITE_CHAIN?: 'sepolia' | 'hardhat'
  /** RPC Sepolia untuk membaca data. Default: RPC publik. */
  readonly VITE_SEPOLIA_RPC_URL?: string
  /** Project ID WalletConnect dari https://cloud.reown.com */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
