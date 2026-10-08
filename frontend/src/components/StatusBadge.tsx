/** Urutan sama dengan enum Status di TaxVerse.sol */
const TAMPILAN = [
  { label: 'Tidak terdaftar', gaya: 'bg-slate-700/60 text-slate-300 ring-slate-500/40' },
  { label: 'Aktif', gaya: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40' },
  { label: 'Jatuh tempo', gaya: 'bg-amber-500/15 text-amber-300 ring-amber-500/40' },
  { label: 'Terlambat', gaya: 'bg-rose-500/15 text-rose-300 ring-rose-500/40' },
]

export function StatusBadge({ status }: { status: number }) {
  const t = TAMPILAN[status] ?? TAMPILAN[0]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${t.gaya}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {t.label}
    </span>
  )
}
