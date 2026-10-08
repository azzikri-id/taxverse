// Salin ABI + alamat kontrak dari hasil deploy Hardhat Ignition ke frontend.
// Jalankan ulang setiap kali kontrak di-deploy ulang:  npm run sync-contracts
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const deploymentsDir = new URL('../../contracts/ignition/deployments/', import.meta.url)
const output = new URL('../src/contracts/generated.ts', import.meta.url)

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'))

const deployments = {}
let abis

for (const dir of readdirSync(deploymentsDir)) {
  const match = dir.match(/^chain-(\d+)$/)
  if (!match) continue
  const chainDir = new URL(`${dir}/`, deploymentsDir)
  const addressesFile = new URL('deployed_addresses.json', chainDir)
  if (!existsSync(addressesFile)) continue

  const addresses = readJson(addressesFile)
  const journal = readFileSync(new URL('journal.jsonl', chainDir), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
  const confirm = journal.find(
    (e) => e.type === 'TRANSACTION_CONFIRM' && e.futureId === 'TaxVerseModule#TaxVerse',
  )

  deployments[match[1]] = {
    taxverse: addresses['TaxVerseModule#TaxVerse'],
    mockIdr: addresses['TaxVerseModule#MockIDR'],
    fromBlock: confirm?.receipt?.blockNumber ?? 0,
  }

  // ABI diambil dari deployment Sepolia jika ada (versi yang benar-benar online)
  if (!abis || match[1] === '11155111') {
    abis = {
      taxverse: readJson(new URL('artifacts/TaxVerseModule%23TaxVerse.json', chainDir)).abi,
      mockIdr: readJson(new URL('artifacts/TaxVerseModule%23MockIDR.json', chainDir)).abi,
    }
  }
}

if (!abis) throw new Error('Belum ada hasil deploy di contracts/ignition/deployments')

const entries = Object.entries(deployments)
  .map(
    ([chainId, d]) =>
      `  ${chainId}: {\n    taxverse: '${d.taxverse}',\n    mockIdr: '${d.mockIdr}',\n    fromBlock: ${d.fromBlock}n,\n  },`,
  )
  .join('\n')

writeFileSync(
  output,
  `// File ini dibuat otomatis oleh scripts/sync-contracts.mjs. Jangan diedit manual.

export const deployments = {
${entries}
} as const

export const taxverseAbi = ${JSON.stringify(abis.taxverse, null, 2)} as const

export const mockIdrAbi = ${JSON.stringify(abis.mockIdr, null, 2)} as const
`,
)

console.log(`generated.ts diperbarui untuk chain: ${Object.keys(deployments).join(', ')}`)
