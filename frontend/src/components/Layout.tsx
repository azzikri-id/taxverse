import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Link, NavLink, Outlet } from 'react-router'

import { contracts, explorerLink, targetChain } from '../config.ts'
import { alamatPendek } from '../lib/format.ts'

const MENU = [
  { to: '/', label: 'Cek Pajak', end: true },
  { to: '/faucet', label: 'Faucet' },
]

export function Layout() {
  const linkKontrak = explorerLink('address', contracts.taxverse)

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_#312e81_0%,_#020617_55%)]">
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            TaxVerse
          </Link>
          <nav className="flex gap-1 text-sm">
            {MENU.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`
                }
              >
                {m.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        Simulasi di {targetChain.name}. Kontrak TaxVerse:{' '}
        {linkKontrak ? (
          <a href={linkKontrak} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
            {alamatPendek(contracts.taxverse)}
          </a>
        ) : (
          <span className="font-mono">{alamatPendek(contracts.taxverse)}</span>
        )}
      </footer>
    </div>
  )
}

