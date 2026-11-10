import { useState } from 'react'
import { REVIEW_STATE_META, STATUS_META, type FindingStatus, type Severity } from '../data/status'
import { stepEyebrow } from '../data/screens'
import { useDemo, useHumanReview, useViewedReview } from '../state/DemoStore'
import { NoReviewState } from '../components/review/NoReviewState'
import { VersionSwitcher } from '../components/ui/VersionSwitcher'
import { FilterChips } from '../components/ui/FilterChips'
import { EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { SegmentedBar } from '../components/ui/SegmentedBar'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { StatusBadge, Tag } from '../components/ui/StatusBadge'
import { ScoreRing } from '../components/ui/ScoreRing'
import { SCORE_NOTE, scoreOf } from '../lib/score'

const statusOrder: FindingStatus[] = ['fulfilled', 'partial', 'not_found', 'needs_review', 'na']
const severityOrder: Severity[] = ['information', 'minor', 'major', 'critical']
const compactId = (value: string) => value.length > 15 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
type Filter = 'all' | 'action' | 'fulfilled'

export function ReviewResult({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const hr = useHumanReview()
  const demo = useDemo()
  const review = useViewedReview()
  if (demo.sampleTarget) return <SampleRecordResult onNavigate={onNavigate} />
  if (!review) return <NoReviewState screen="Hasil tinjauan" />
  const { findings, sopAssessment, templateAssessment, recommendations } = review
  const isLatest = review.version === demo.latestVersion
  const sop = scoreOf(sopAssessment), tpl = scoreOf(templateAssessment)
  const needsAction = findings.filter((f) => f.status !== 'fulfilled' && f.status !== 'na')
  const shown = filter === 'all' ? findings : filter === 'action' ? needsAction : findings.filter((f) => f.status === 'fulfilled')
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'Semua temuan', n: findings.length },
    { id: 'action', label: 'Perlu perhatian', n: needsAction.length },
    { id: 'fulfilled', label: 'Terpenuhi', n: findings.length - needsAction.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header band */}
      <GlassPanel variant="glass-strong" className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow mb-2">{stepEyebrow('result', 'Hasil tinjauan')}</p>
            <h1 className="max-w-full break-words text-3xl font-semibold tracking-tight sm:text-4xl">{review.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span title={review.id}><Tag>ID {compactId(review.id)}</Tag></span>
              <Tag>{review.version}</Tag><Tag tone="neutral">{review.domain}</Tag>
            </div>
            <p className="mt-1 text-xs text-ink-3">Tahap pertama AI selesai {review.checkedAt} · data demonstrasi simulasi</p>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Persentase kesesuaian"><Tag>Kesesuaian SOP {sop.pct}%</Tag><Tag>Kelengkapan templat {tpl.pct}%</Tag></div>
            <div className="mt-3"><VersionSwitcher /></div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-review-soft px-3.5 py-1.5 text-sm font-semibold text-review">
              <Icon name="user" size={16} />{hr.status === 'reviewed' ? 'Tinjauan manusia tercatat' : 'Menunggu tinjauan manusia'}
            </span>
            <p className="text-xs text-ink-3">Belum final sampai peninjau mengonfirmasi.</p>
            {review.version === 'V2' && <Button variant="glass" icon="compare" className="mt-1 !min-h-9" onClick={() => onNavigate('compare')}>Bandingkan dengan V1</Button>}
          </div>
        </div>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-3" aria-label="Dokumen yang ditinjau">
          {review.docs.map((d) => (
            <li key={d.role} className="glass-inset flex items-center gap-3 px-3.5 py-3">
              <Icon name={d.name.endsWith('pdf') ? 'pdf' : 'doc'} className="shrink-0 text-brand" />
              <div className="min-w-0"><p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">{d.role}</p><p className="text-sm font-semibold [overflow-wrap:anywhere]">{d.name}</p><p className="text-xs text-ink-3">{d.meta}</p></div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      {/* Summary + human review */}
      <div className="grid gap-5 lg:grid-cols-12">
        <GlassPanel className="p-5 sm:p-6 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Ringkasan tinjauan AI</h2>
            <span className="rounded-full bg-navy/6 px-2.5 py-1 text-[11px] font-semibold text-ink-3">Simulasi</span>
          </div>
          <p className="leading-relaxed text-ink-2">{review.summary}</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-navy/8 pt-4 text-center">
            {[{ k: 'Temuan', v: findings.length }, { k: 'Perlu perhatian', v: needsAction.length }, { k: 'Terpenuhi', v: findings.length - needsAction.length }].map((x) => (
              <div key={x.k}><dd className="text-3xl font-semibold tracking-tight">{x.v}</dd><dt className="text-xs font-semibold text-ink-3">{x.k}</dt></div>
            ))}
          </dl>
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6 lg:col-span-5">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Progres tinjauan</h2>
          <ol className="space-y-0">
            {[
              { l: 'Tahap pertama AI', d: `Selesai untuk ${review.version}`, s: 'done' },
              { l: 'Tinjauan manusia', d: hr.status === 'reviewed' ? 'Keputusan peninjau tercatat' : hr.status === 'draft' ? 'Catatan tersimpan, belum selesai ditinjau' : 'Menunggu peninjau', s: hr.status === 'reviewed' ? 'done' : 'current' },
              { l: 'Revisi dan periksa ulang', d: demo.reviews.V2 ? 'V2 dibuat dari laporan yang direvisi' : 'Revisi akar masalah, lalu periksa ulang', s: demo.reviews.V2 ? 'done' : 'next' },
            ].map((x, i, a) => (
              <li key={x.l} className="relative flex gap-3 pb-4 last:pb-0">
                {i < a.length - 1 && <span aria-hidden="true" className="absolute top-8 bottom-0 left-[13px] w-0.5 bg-navy/10" />}
                <span className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${x.s === 'done' ? 'bg-brand text-white' : x.s === 'current' ? 'bg-review text-white' : 'border border-navy/15 text-ink-3'}`}>
                  {x.s === 'done' ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <div><p className="text-sm font-semibold">{x.l}</p><p className="text-xs text-ink-3">{x.d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {!demo.reviews.V2 && <Button variant="glass" icon="refresh" className="!min-h-9" onClick={demo.openRevision}>Revisi akar masalah</Button>}
            {demo.reviews.V2 && <Button variant="glass" icon="compare" className="!min-h-9" onClick={() => onNavigate('compare')}>Bandingkan V1 dan V2</Button>}
            {!isLatest && demo.latestVersion && <Button variant="ghost" className="!min-h-9" onClick={() => demo.selectVersion(demo.latestVersion!)}>Kembali ke terbaru</Button>}
          </div>
          <p className="mt-3 rounded-control bg-review-soft px-3 py-2 text-xs font-medium text-review">DocuGuard AI adalah peninjau tahap pertama, bukan auditor final. Tinjauan manusia tidak pernah mengubah penilaian AI.</p>
        </GlassPanel>
      </div>

      {/* Two independent assessments */}
      <div>
        <p className="mb-3 text-sm text-ink-3"><strong className="text-ink">Dua penilaian terpisah.</strong> Kepatuhan SOP dan kelengkapan templat dinilai secara independen dan tidak pernah digabung. {SCORE_NOTE}</p>
        <div className="grid grid-cols-1 gap-5">
          <Assessment title="Kepatuhan SOP" scoreLabel="Kesesuaian SOP" sub="Apakah laporan memenuhi persyaratan SOP?" doc={review.docs.find(d => d.role === 'SOP')?.name || 'SOP aktif'} unit="persyaratan" items={sopAssessment} refPrefix="SOP " />
          <Assessment title="Kelengkapan Templat" scoreLabel="Kelengkapan templat" sub="Apakah bagian-bagian templat sudah terisi?" doc={review.docs.find(d => d.role === 'Templat' || d.role === 'Template')?.name || 'Template aktif'} unit="bagian yang berlaku" items={templateAssessment} refPrefix="" />
        </div>
      </div>

      {/* Findings overview */}
      <section className="surface overflow-hidden" aria-labelledby="fo-h">
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow mb-1">Ikhtisar temuan</p><h2 id="fo-h" className="text-lg font-semibold tracking-tight">{findings.length} temuan pada {compactId(review.id)}</h2></div>
            <FilterChips<Filter> label="Filter temuan" value={filter} onChange={setFilter} options={filters.map((f) => ({ id: f.id, label: f.label, count: f.n }))} />
          </div>
          {/* Two separate legends: status vs severity */}
          <div className="grid gap-3 rounded-2xl bg-canvas/70 p-3.5 text-xs sm:grid-cols-2">
            <div><p className="mb-1.5 font-semibold text-ink-3">Status kepatuhan · apakah persyaratan terpenuhi?</p><div className="flex flex-wrap gap-1.5">{statusOrder.map((s) => <StatusBadge key={s} status={s} />)}</div></div>
            <div><p className="mb-1.5 font-semibold text-ink-3">Keparahan · seberapa penting jika ada celah?</p><div className="flex flex-wrap gap-1.5">{severityOrder.map((s) => <SeverityBadge key={s} severity={s} />)}</div></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-y border-navy/8 bg-canvas/70 text-xs text-ink-3">
              {['ID', 'Temuan', 'Dipetakan ke', 'Status kepatuhan', 'Keparahan', ''].map((h, i) => <th key={i} scope="col" className="px-5 py-2.5 font-semibold first:sm:pl-6">{h || <span className="sr-only">Aksi</span>}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-navy/5">
              {shown.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-brand-soft/70">
                  <td className="px-5 py-4 text-xs font-semibold text-ink-3 sm:pl-6">{f.id}</td>
                  <td className="max-w-sm px-5 py-4"><p className="font-semibold">{f.title}</p><p className="mt-0.5 text-xs text-ink-3">{f.summary}</p></td>
                  <td className="px-5 py-4 text-xs text-ink-2"><p>{f.sopRef}</p><p className="text-ink-3">Templat {f.templateSection}</p></td>
                  <td className="px-5 py-4"><StatusBadge status={f.status} />{f.status === 'needs_review' && hr.status !== 'pending' && <p className="mt-1.5 text-[11px] font-semibold text-ink-3">Tinjauan manusia: {hr.status === 'reviewed' ? 'selesai' : 'catatan tersimpan'}</p>}</td>
                  <td className="px-5 py-4"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-5 py-4 text-right"><Button variant="ghost" onClick={() => onNavigate('findings')} aria-label={`Buka ${f.title} di jejak bukti`} className="!min-h-9 !px-3"><Icon name="arrow" size={16} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recommendations */}
      <GlassPanel variant="glass-strong" className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow mb-1">Rekomendasi utama</p><h2 className="text-lg font-semibold tracking-tight">Yang perlu diperbaiki sebelum laporan ditutup</h2></div>
          <span className="rounded-full bg-navy/6 px-2.5 py-1 text-[11px] font-semibold text-ink-3">Saran AI · simulasi</span>
        </div>
        <ol className="grid gap-3 lg:grid-cols-3">
          {recommendations.map((r, i) => {
            const f = findings.find((x) => x.id === r.findingId)!
            return (
              <li key={r.id} className="surface lift flex flex-col gap-2.5 !rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2"><span className="grid size-7 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span><SeverityBadge severity={f.severity} /></div>
                <p className="font-semibold">{r.text}</p>
                <p className="flex-1 text-sm text-ink-3">{r.detail}</p>
                <p className="flex items-center gap-2 border-t border-navy/8 pt-2.5 text-xs text-ink-3">{f.id} · {f.title}<span className="ml-auto"><StatusBadge status={f.status} /></span></p>
              </li>
            )
          })}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button icon="search" onClick={() => onNavigate('findings')}>Lihat temuan dan jejak bukti</Button>
          <Button variant="glass" icon="user" onClick={() => onNavigate('human')}>Lanjut ke tinjauan manusia</Button>
        </div>
      </GlassPanel>
    </div>
  )
}


function cleanTemplatePoint(text: string) {
  return String(text ?? '').replace(/^[^A-Za-z0-9]+/, '').trim()
}

function Assessment({ title, scoreLabel, sub, doc, unit, items, refPrefix }: {
  title: string; scoreLabel: string; sub: string; doc: string; unit: string; refPrefix: string
  items: { ref: string; label: string; status: FindingStatus }[]
}) {
  const { met, total, pct } = scoreOf(items)
  const counts = statusOrder.map((s) => ({ s, n: items.filter((i) => i.status === s).length })).filter((c) => c.n)
  return (
    <GlassPanel variant="glass-strong" className="p-5 sm:p-6" aria-label={title}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-1">{doc}</p>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-ink-3">{sub}</p>
          <p className="mt-3 text-sm font-semibold">{met} dari {total} {unit} terpenuhi</p>
        </div>
        <ScoreRing value={pct} display={`${pct}%`} label={scoreLabel} size={96} />
      </div>
      <div className="mt-4"><SegmentedBar items={items} label={`${title}: ${counts.map((c) => `${c.n} ${STATUS_META[c.s].label}`).join(', ')}`} /></div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {counts.map((c) => <span key={c.s} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: STATUS_META[c.s].fg }} />{c.n} {STATUS_META[c.s].label}</span>)}
      </div>
      <ul className="surface mt-4 divide-y divide-navy/5 !rounded-2xl">
        {items.map((i) => (
          <li key={i.ref} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
            <span className="min-w-[72px] shrink-0 text-xs font-semibold text-ink-3">{refPrefix ? `${refPrefix}${cleanTemplatePoint(i.ref)}` : cleanTemplatePoint(i.ref)}</span>
            <span className="min-w-0 flex-1 font-medium">{cleanTemplatePoint(i.label)}</span>
            <StatusBadge status={i.status} />
          </li>
        ))}
      </ul>
    </GlassPanel>
  )
}

function SampleRecordResult({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { sampleTarget: target, history } = useDemo()
  const rec = history.find((r) => r.id === target!.id && r.version === target!.version)
  const state = rec ? REVIEW_STATE_META[rec.status] : null
  return (
    <div className="space-y-6">
      <GlassPanel variant="glass-strong" className="p-5 sm:p-7">
        <p className="eyebrow mb-2">Hasil tinjauan · catatan riwayat</p>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{target!.id}</h1><Tag>{target!.version}</Tag>{rec?.latest && <Tag tone="neutral">Terbaru</Tag>}</div>
        {rec && <><p className="mt-1.5 text-ink-2">{rec.title}</p><p className="mt-1 text-xs text-ink-3">{rec.report} · {rec.date}</p></>}
        {state && <span className={`mt-4 inline-block rounded-full px-3 py-1.5 text-sm font-semibold ${state.cls}`}>{state.text}</span>}
      </GlassPanel>
      <GlassPanel>
        <EmptyState icon="file" title="Temuan rinci tidak termasuk dalam catatan contoh ini"
          body="Prototipe hanya memiliki penilaian lengkap untuk tinjauan yang dibuat dalam demo ini. Buka riwayat untuk menemukannya."
          action={<div className="mt-2 flex flex-wrap justify-center gap-2"><Button onClick={() => onNavigate('history')} variant="glass">Kembali ke riwayat</Button></div>} />
      </GlassPanel>
    </div>
  )
}
