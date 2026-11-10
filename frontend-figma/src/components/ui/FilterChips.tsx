export function FilterChips<T extends string>({ label, options, value, onChange }: {
  label: string; value: T; onChange: (v: T) => void
  options: { id: T; label: string; count?: number }[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`min-h-9 rounded-full px-3.5 text-sm font-semibold transition ${value === o.id ? 'bg-brand text-white' : 'bg-navy/5 text-ink-2 hover:bg-navy/10'}`}>
          {o.label}{o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
