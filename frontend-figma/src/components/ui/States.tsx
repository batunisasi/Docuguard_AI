import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

const tones = {
  success: { cls: 'bg-ok-soft text-ok', icon: 'check' },
  warning: { cls: 'bg-partial-soft text-partial', icon: 'alert' },
  error: { cls: 'bg-missing-soft text-missing', icon: 'alert' },
  info: { cls: 'bg-brand-soft text-brand', icon: 'info' },
}

export function Callout({ tone = 'info', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const t = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-control px-3.5 py-2.5 text-sm font-medium ${t.cls}`}>
      <Icon name={t.icon} size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ icon = 'file', title, body, action }: { icon?: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon name={icon} /></div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-sm text-ink-3">{body}</p>
      {action}
    </div>
  )
}
