import { useRef, useState } from 'react'
import type { ReviewData } from '../data/review'
import { STATUS_META } from '../data/status'
import { stepEyebrow } from '../data/screens'
import { useDemo, useHumanReview, useViewedReview } from '../state/DemoStore'
import { NoReviewState } from '../components/review/NoReviewState'
import { VersionSwitcher } from '../components/ui/VersionSwitcher'
import { EvidenceViewer } from '../components/review/EvidenceViewer'
import { Button } from '../components/ui/Button'
import { FilterChips } from '../components/ui/FilterChips'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Callout, EmptyState } from '../components/ui/States'
import { StatusBadge, Tag } from '../components/ui/StatusBadge'

type Filter = 'all' | 'attention' | 'fulfilled'

export function FindingsEvidence({ onNavigate }: { onNavigate: (id: string) => void }) {
  const demo = useDemo()
  const d = useViewedReview()
  if (!d) return <NoReviewState screen="Temuan dan jejak bukti" />
  if (!d.findings?.length) return <GlassPanel variant="glass-strong" className="p-5"><EmptyState icon="info" title="Belum ada temuan terperinci" body="Hasil review ini tidak mengandung rincian temuan. Buka hasil tinjauan untuk melihat ringkasan SOP dan templat." action={<Button onClick={() => onNavigate('result')}>Kembali ke hasil tinjauan</Button>} /></GlassPanel>
  return <FindingsBody key={`${d.id}-${d.version}-${demo.focusFinding ?? ''}`} d={d} focus={demo.focusFinding} onNavigate={onNavigate} />
}

function FindingsBody({ d, focus, onNavigate }: { d: ReviewData; focus: string | null; onNavigate: (id: string) => void }) {
  const hr = useHumanReview()
  const demo = useDemo()
  const [panelOpen, setPanelOpen] = useState(true)
  const firstOpen = d.findings.find((f) => f.id === focus)?.id ?? d.findings.find((f) => f.status !== 'fulfilled')?.id ?? d.findings[0].id
  const [open, setOpen] = useState<Set<string>>(new Set([firstOpen]))
  const [selected, setSelected] = useState({ findingId: firstOpen, evidenceId: d.findings.find((f) => f.id === firstOpen)?.evidence[0]?.id ?? null })
  const [filter, setFilter] = useState<Filter>('all')
  const panel = useRef<HTMLDivElement>(null)

  const attention = d.findings.filter((f) => f.status !== 'fulfilled' && f.status !== 'na')
  const shown = filter === 'all' ? d.findings : filter === 'attention' ? attention : d.findings.filter((f) => f.status === 'fulfilled')
  const current = d.findings.find((f) => f.id === selected.findingId)!

  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const inspect = (fid: string, eid: string | null) => {
    setSelected({ findingId: fid, evidenceId: eid })
    setPanelOpen(true)
    if (window.innerWidth < 1280) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2">{stepEyebrow('findings', 'Temuan dan jejak bukti')}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Alasan di balik keputusan AI</h1>
          <p className="mt-1.5 text-ink-2">Setiap temuan menampilkan persyaratan, bukti yang ditemukan dalam laporan, dan penalaran AI agar peninjau dapat memverifikasinya.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Tag>{d.id}</Tag><Tag tone="neutral">{d.version}</Tag><Button variant="glass" onClick={() => onNavigate('result')}>Kembali ke hasil</Button></div>
        <div className="w-full"><VersionSwitcher /></div>
      </div>

      <Callout tone="info"><strong>Status dan keparahan adalah dua hal terpisah.</strong> Status menyatakan apakah persyaratan terpenuhi. Keparahan menyatakan seberapa penting persyaratan tersebut bila ada celah. Yang satu tidak menentukan yang lain. Seluruh penalaran AI di sini adalah simulasi.</Callout>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <section className="space-y-3 xl:col-span-7" aria-label="Temuan">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips<Filter> label="Filter temuan" value={filter} onChange={setFilter} options={[
              { id: 'all', label: 'Semua', count: d.findings.length },
              { id: 'attention', label: 'Perlu perhatian', count: attention.length },
              { id: 'fulfilled', label: 'Terpenuhi', count: d.findings.length - attention.length },
            ]} />
            <div className="flex gap-1">
              <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => setOpen(new Set(d.findings.map((f) => f.id)))}>Buka semua</Button>
              <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => setOpen(new Set())}>Tutup semua</Button>
            </div>
          </div>

          {shown.map((f) => {
            const isOpen = open.has(f.id)
            const isSel = selected.findingId === f.id
            const reviewable = f.status === 'needs_review'
            return (
              <article key={f.id} className={`surface overflow-hidden transition-shadow ${isSel ? 'ring-2 ring-brand/35' : ''}`}>
                <h2 className="m-0">
                  <button aria-expanded={isOpen} aria-controls={`${f.id}-body`} onClick={() => toggle(f.id)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-brand-soft/50 sm:px-5">
                    <span className="w-11 shrink-0 text-xs font-semibold text-ink-3">{f.id}</span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{f.title}</span><span className="mt-0.5 block text-xs font-normal text-ink-3">{f.sopRef} · Templat {f.templateSection}</span></span>
                    <span className="hidden flex-col items-end gap-1.5 sm:flex"><StatusBadge status={f.status} /><SeverityBadge severity={f.severity} /></span>
                    <Icon name="arrow" size={18} className={`shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                </h2>
                {isOpen && (
                  <div id={`${f.id}-body`} className="space-y-4 border-t border-navy/8 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-2 sm:hidden"><StatusBadge status={f.status} /><SeverityBadge severity={f.severity} /></div>
                    <Field label="Persyaratan"><span className="text-ink-2"><strong className="text-ink">{f.requirement.ref}.</strong> {f.requirement.text}</span></Field>
                    <Field label="Bukti dalam laporan">
                      {f.evidence.length === 0 ? <span className="text-missing">Tidak ditemukan. Tidak ada kutipan dalam laporan yang cocok dengan persyaratan ini.</span> : (
                        <ul className="space-y-2">
                          {f.evidence.map((e) => (
                            <li key={e.id}>
                              <button onClick={() => inspect(f.id, e.id)} className={`w-full rounded-xl border p-3 text-left transition hover:border-brand/50 hover:bg-brand-soft/50 ${isSel && selected.evidenceId === e.id ? 'border-brand/60 bg-brand-soft/60' : 'border-navy/10 bg-paper'}`}>
                                <span className="line-clamp-2 text-sm text-ink">“{e.excerpt}”</span>
                                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-3"><span>{e.docName}</span><span>{e.location ?? 'Lokasi tidak tersedia'}</span>{e.addedInVersion && <Tag>Ditambahkan di {e.addedInVersion}</Tag>}<span className="ml-auto font-semibold text-brand">Periksa</span></span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Penjelasan AI">{f.explanation}</Field>
                      <Field label="Rekomendasi">{f.recommendation}</Field>
                    </div>
                    <dl className="grid gap-3 border-t border-navy/8 pt-3 text-xs sm:grid-cols-3">
                      <div><dt className="font-semibold text-ink-3">Status kepatuhan</dt><dd className="mt-1"><StatusBadge status={f.status} /></dd></div>
                      <div><dt className="font-semibold text-ink-3">Keparahan temuan</dt><dd className="mt-1"><SeverityBadge severity={f.severity} /></dd></div>
                      <div><dt className="font-semibold text-ink-3">Sumber bukti</dt><dd className="mt-1 font-semibold break-words text-ink">{f.evidence.length ? [...new Set(f.evidence.map((e) => e.docName))].join(', ') : 'Tidak ada'}</dd></div>
                    </dl>
                    {f.id === 'F-03' && f.status === 'partial' && !demo.reviews.V2 && (
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft p-3.5">
                        <Icon name="refresh" className="text-brand" />
                        <p className="flex-1 text-sm font-medium text-brand">Tambahkan bukti yang kurang pada akar masalah, lalu periksa ulang untuk membuat V2.</p>
                        <Button onClick={demo.openRevision} className="!min-h-9">Revisi akar masalah</Button>
                      </div>
                    )}
                    {reviewable && (
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-review-soft p-3.5">
                        <Icon name="user" className="text-review" />
                        <p className="flex-1 text-sm font-medium text-review">{hr.status === 'reviewed' ? 'Peninjau telah mencatat keputusan. Status AI di atas tidak berubah.' : 'Temuan ini memerlukan keputusan manusia.'}</p>
                        <Button onClick={() => onNavigate('human')} className="!min-h-9">{hr.status === 'reviewed' ? 'Lihat tinjauan' : 'Buka tinjauan manusia'}</Button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <div ref={panel} className="scroll-mt-5 xl:sticky xl:top-5 xl:col-span-5">
          {panelOpen ? (
            <GlassPanel variant="glass-strong" className="p-5 sm:p-6" aria-label="Detail bukti">
              <div className="mb-3 flex justify-end"><Button variant="ghost" icon="close" className="!min-h-9 !px-3" onClick={() => setPanelOpen(false)}>Tutup panel</Button></div>
              <EvidenceViewer finding={current} sopDoc={d.docs[0].name} evidenceId={selected.evidenceId} onSelect={(id) => setSelected((s) => ({ ...s, evidenceId: id }))} />
              <p className="mt-4 text-[11px] text-ink-3">{STATUS_META[current.status].label} adalah penilaian simulasi AI untuk persyaratan ini.</p>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-5 text-center"><p className="mb-3 text-sm text-ink-3">Panel detail bukti ditutup.</p><Button variant="glass" icon="search" onClick={() => setPanelOpen(true)}>Buka detail bukti</Button></GlassPanel>
          )}
        </div>
      </div>

      <GlassPanel className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm text-ink-2"><strong className="text-ink">{attention.length} temuan</strong> belum terpenuhi. {d.findings.filter((f) => f.status === 'needs_review').length} memerlukan keputusan manusia.</p>
        <Button icon="arrow" onClick={() => onNavigate('human')}>Lanjut ke tinjauan manusia</Button>
      </GlassPanel>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">{label}</p><div className="text-sm leading-relaxed text-ink">{children}</div></div>
}
