import type { ElementType, ReactNode } from 'react'

type Variant = 'glass' | 'glass-strong' | 'surface'

export function GlassPanel({ as: Tag = 'section', variant = 'glass', sheen = false, className = '', children, ...rest }:
  { as?: ElementType; variant?: Variant; sheen?: boolean; className?: string; children: ReactNode; [k: string]: unknown }) {
  return (
    <Tag className={`${variant} ${sheen ? 'glass-sheen' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}
