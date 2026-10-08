import type { ReactNode } from 'react'

/** Kartu konten standar */
export function Kartu({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-slate-900/70 p-6 ${className}`}>{children}</section>
}
