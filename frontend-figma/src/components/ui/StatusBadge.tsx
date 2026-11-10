import { STATUS_META, type FindingStatus } from '../../data/status'

export function StatusBadge({ status, label }: { status: FindingStatus; label?: string }) {
  const m = STATUS_META[status]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: m.fg, background: m.bg }}>
      <span className="size-1.5 rounded-full" style={{ background: m.fg }} />
      {label ?? m.label}
    </span>
  )
}

export function Tag({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'neutral' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
      tone === 'brand' ? 'bg-brand-soft text-brand' : 'bg-navy/5 text-ink-2'}`}>
      {children}
    </span>
  )
}
