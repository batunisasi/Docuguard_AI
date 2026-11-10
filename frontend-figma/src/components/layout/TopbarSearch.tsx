import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { STATUS_META, REVIEW_STATE_META } from '../../data/status'
import { useDemo } from '../../state/DemoStore'
import { Icon } from '../ui/Icon'
import { usePopover } from './usePopover'

type Hit =
  | { kind: 'review'; key: string; title: string; sub: string; run: () => void; badge: string }
  | { kind: 'finding'; key: string; title: string; sub: string; run: () => void; badge: string }

/** Searches review IDs, report names and finding titles across every review in the demo. */
export function TopbarSearch() {
  const demo = useDemo()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const root = usePopover(open, () => setOpen(false))

  // "/" focuses the search field
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); input.current?.focus(); setOpen(true) }
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    const reviews: Hit[] = demo.history
      .filter((r) => [r.id, r.title, r.report].some((x) => x.toLowerCase().includes(t)))
      .map((r) => ({ kind: 'review', key: `r-${r.key}`, title: `${r.id} · ${r.version}`, sub: `${r.report}`, badge: REVIEW_STATE_META[r.status].text, run: () => demo.openRecord(r.id, r.version) }))
    const findings: Hit[] = demo.cases.flatMap((c) =>
      (['V2', 'V1'] as const).filter((v) => c.reviews[v]).flatMap((v) =>
        c.reviews[v]!.findings.filter((f) => f.title.toLowerCase().includes(t) || f.id.toLowerCase() === t)
          .map((f): Hit => ({ kind: 'finding', key: `f-${c.id}-${v}-${f.id}`, title: f.title, sub: `${c.id} · ${v} · ${f.id}`, badge: STATUS_META[f.status].label, run: () => demo.openFinding(c.id, v, f.id) }))))
    return [...reviews.slice(0, 5), ...findings.slice(0, 6)]
  }, [q, demo.history, demo.cases]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setIdx(0), [q])
  const choose = (h: Hit) => { setOpen(false); setQ(''); h.run() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setIdx((i) => Math.min(i + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && hits[idx]) { e.preventDefault(); choose(hits[idx]) }
  }
  const showPanel = open && q.trim().length > 0
  const reviewHits = hits.filter((h) => h.kind === 'review'), findingHits = hits.filter((h) => h.kind === 'finding')

  const Row = ({ h }: { h: Hit }) => {
    const i = hits.indexOf(h)
    return (
      <li role="option" id={`${listId}-${i}`} aria-selected={i === idx}>
        <button type="button" tabIndex={-1} onMouseEnter={() => setIdx(i)} onClick={() => choose(h)}
          className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition ${i === idx ? 'bg-brand-soft' : 'hover:bg-brand-soft/60'}`}>
          <Icon name={h.kind === 'review' ? 'file' : 'flag'} size={16} className="mt-0.5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{h.title}</span><span className="block truncate text-xs text-ink-3">{h.sub}</span></span>
          <span className="shrink-0 rounded-full bg-navy/6 px-2 py-0.5 text-[11px] font-semibold text-ink-2">{h.badge}</span>
        </button>
      </li>
    )
  }

  return (
    <div ref={root} className="relative ml-auto min-w-0 flex-1 md:max-w-sm md:flex-none md:basis-80">
      <label className="glass flex h-11 items-center gap-2 !rounded-control px-3.5 text-ink-3 focus-within:ring-2 focus-within:ring-brand/40">
        <Icon name="search" size={18} />
        <span className="sr-only">Cari tinjauan dan temuan</span>
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          role="combobox" aria-expanded={showPanel} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={showPanel && hits[idx] ? `${listId}-${idx}` : undefined}
          placeholder="Cari tinjauan, laporan, temuan" autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" />
        {q ? <button type="button" onClick={() => { setQ(''); input.current?.focus() }} aria-label="Hapus pencarian" className="grid size-6 place-items-center rounded-full hover:bg-navy/8"><Icon name="close" size={13} /></button>
          : <kbd className="hidden rounded-md bg-navy/5 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3 md:block">/</kbd>}
      </label>
      {showPanel && (
        <div className="surface absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-[70vh] overflow-y-auto !rounded-2xl p-2 shadow-float md:w-[26rem] md:max-w-[90vw]">
          <ul id={listId} role="listbox" aria-label="Hasil pencarian">
            {hits.length === 0 && <li role="presentation" className="px-3 py-4 text-center text-sm text-ink-3">Tidak ada hasil untuk “{q.trim()}”. Coba ID tinjauan, nama laporan, atau judul temuan.</li>}
            {reviewHits.length > 0 && <li role="presentation" className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Tinjauan</li>}
            {reviewHits.map((h) => <Row key={h.key} h={h} />)}
            {findingHits.length > 0 && <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Temuan</li>}
            {findingHits.map((h) => <Row key={h.key} h={h} />)}
          </ul>
        </div>
      )}
    </div>
  )
}
