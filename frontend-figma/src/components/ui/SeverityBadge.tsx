import { SEVERITY_META, type Severity } from '../../data/status'

const tone: Record<Severity, string> = {
  information: 'border-navy/15 bg-transparent text-ink-3',
  minor: 'border-sage/60 bg-brand-soft text-ink-2',
  major: 'border-brand/50 bg-mint/70 text-ink',
  critical: 'border-navy bg-navy text-white',
}

/** Severity is deliberately monochrome + signal bars so it never reads as a compliance status. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${tone[severity]}`}>
      <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 3.6} y={9 - i * 3} width="2.4" height={3 + i * 3} rx="0.8" fill="currentColor" opacity={i < m.level ? 1 : 0.22} />
        ))}
      </svg>
      <span className="sr-only">Keparahan: </span>{m.label}
    </span>
  )
}
