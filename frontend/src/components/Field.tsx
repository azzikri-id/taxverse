import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  bantuan?: ReactNode
  error?: string | false
  aksi?: ReactNode
}

/** Input berlabel dengan teks bantuan dan pesan error. */
export function Field({ label, bantuan, error, aksi, className = '', ...input }: Props) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-medium text-slate-300">
        {label}
        {aksi}
      </span>
      <input
        {...input}
        className={`mt-1.5 w-full rounded-xl border bg-slate-950/60 px-4 py-2.5 outline-none transition focus:border-indigo-500 ${
          error ? 'border-rose-500/60' : 'border-slate-700'
        } ${className}`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-rose-300">{error}</span>
      ) : (
        bantuan && <span className="mt-1 block text-xs text-slate-500">{bantuan}</span>
      )}
    </label>
  )
}
