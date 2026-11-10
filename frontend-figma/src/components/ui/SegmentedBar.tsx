import { STATUS_META, type FindingStatus } from '../../data/status'

export function SegmentedBar({ items, label }: { items: { status: FindingStatus }[]; label: string }) {
  return (
    <div className="flex gap-1" role="img" aria-label={label}>
      {items.map((it, i) => (
        <span key={i} className="h-2.5 flex-1 rounded-full" style={{ background: STATUS_META[it.status].fg }} />
      ))}
    </div>
  )
}
