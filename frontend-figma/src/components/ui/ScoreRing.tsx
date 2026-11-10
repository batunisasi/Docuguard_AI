import { useEffect, useId, useState } from 'react'

/** `value` drives the arc (0-100). `display` replaces the centre text, e.g. a count such as "3/6". */
export function ScoreRing({ value, label, display, size = 120, from = '#729B83', to = '#1C5945' }:
  { value: number; label: string; display?: string; size?: number; from?: string; to?: string }) {
  const id = useId()
  const [shown, setShown] = useState(0)
  useEffect(() => { const t = setTimeout(() => setShown(value), 150); return () => clearTimeout(t) }, [value])
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <figure className="m-0 flex flex-col items-center gap-2" aria-label={`${label}: ${display ?? `${value}%`}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <defs>
            <linearGradient id={id} x1="0" x2="1"><stop stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(16 43 35 / 0.08)" strokeWidth="9" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-2xl font-semibold tracking-tight text-ink">{display ?? <>{value}<span className="text-sm text-ink-3">%</span></>}</span>
        </div>
      </div>
      <figcaption className="text-center text-xs font-semibold text-ink-2">{label}</figcaption>
    </figure>
  )
}
