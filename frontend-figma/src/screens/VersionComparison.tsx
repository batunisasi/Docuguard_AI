import type { Finding, ReviewData } from '../data/review'
import { stepEyebrow } from '../data/screens'
import { useDemo } from '../state/DemoStore'
import { NoReviewState } from '../components/review/NoReviewState'
import { EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { STATUS_META } from '../data/status'
import { SCORE_NOTE, scoreOf } from '../lib/score'
import { StatusBadge, Tag } from '../components/ui/StatusBadge'

type Change = 'improved' | 'worsened' | 'unchanged' | 'attention' | 'new' | 'removed'
const changeMeta: Record<Change, { label: string; cls: string; icon: string }> = {
  improved: { label: 'Membaik', cls: 'bg-ok-soft text-ok', icon: 'up' },
  worsened: { label: 'Memburuk', cls: 'bg-missing-soft text-missing', icon: 'alert' },
  unchanged: { label: 'Tidak berubah', cls: 'bg-na-soft text-na', icon: 'check' },
  attention: { label: 'Perlu perhatian', cls: 'bg-partial-soft text-partial', icon: 'alert' },
  new: { label: 'Temuan baru', cls: 'bg-review-soft text-review', icon: 'plus' },
  removed: { label: 'Tidak ada di V2', cls: 'bg-na-soft text-na', icon: 'alert' },
}

/** Bandingkan berdasarkan rujukan persyaratan, bukan posisi array (dapat berubah antar-review Gemini). */
const findingKey = (f: Finding) => {
  // Rujukan SOP/templat cenderung stabil, sedangkan penjelasan AI dapat diparafrasekan.
  const sop = String(f.sopRef || '').trim().toLowerCase()
  const template = String(f.templateSection || '').trim().toLowerCase()
  if (sop || template) return `${sop}|${template}`
  return `${String(f.requirement?.ref || '').trim().toLowerCase()}|${String(f.title || '').trim().toLowerCase()}`
}
const positive = (f?: Finding) => f?.status === 'fulfilled' || f?.status === 'na'

export function VersionComparison() {
  const demo = useDemo()
  const prev = demo.reviews.V1
  const curr = demo.reviews.V2
  if (!prev) return <NoReviewState screen="Perbandingan versi" />
  if (!curr) return (
    <div className="mx-auto max-w-xl pt-6">
      <GlassPanel variant="glass-strong">
        <EmptyState icon="compare" title="Belum ada laporan revisi (V2)"
          body="Unggah file laporan yang sudah diperbaiki agar backend memeriksa ulang dengan n8n dan Gemini. V1 akan tetap tersimpan."
          action={<div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button icon="refresh" onClick={demo.openRevision}>Unggah laporan revisi</Button>
            <Button variant="glass" onClick={() => demo.navigate('result')}>Kembali ke hasil</Button>
          </div>} />
      </GlassPanel>
    </div>
  )
  return <ComparisonBody prev={prev} curr={curr} />
}

function ComparisonBody({ prev, curr }: { prev: ReviewData; curr: ReviewData }) {
  const { openRecord, navigate } = useDemo()
  const before = new Map(prev.findings.map(f => [findingKey(f), f]))
  const after = new Map(curr.findings.map(f => [findingKey(f), f]))
  const keys = [...new Set([...before.keys(), ...after.keys()])]
  const rows = keys.map(key => {
    const a = before.get(key)
    const b = after.get(key)
    let change: Change
    if (!a) change = 'new'
    else if (!b) change = 'removed'
    else if (a.status === b.status) change = positive(b) ? 'unchanged' : 'attention'
    else if (!positive(a) && positive(b)) change = 'improved'
    else if (positive(a) && !positive(b)) change = 'worsened'
    else change = 'attention'
    return { key, a, b, change }
  })
  const sopA = scoreOf(prev.sopAssessment), sopB = scoreOf(curr.sopAssessment)
  const tplA = scoreOf(prev.templateAssessment), tplB = scoreOf(curr.templateAssessment)
  const scores = [
    { label: 'Kesesuaian SOP', a: sopA, b: sopB },
    { label: 'Kelengkapan templat', a: tplA, b: tplB },
  ]
  const improved = rows.filter(r => r.change === 'improved')
  const requiringAttention = rows.filter(r => ['worsened', 'attention', 'new', 'removed'].includes(r.change))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2">{stepEyebrow('compare', 'Perbandingan versi')}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Perbandingan V1 dan V2</h1>
          <p className="mt-1.5 text-ink-2">Hasil pemeriksaan ulang dokumen {curr.docs[2]?.name || curr.title} melalui n8n + Gemini.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="glass" onClick={() => navigate('history')}>Kembali ke riwayat</Button>
          <Button variant="glass" onClick={() => openRecord(prev.id, 'V1')}>Buka hasil V1</Button>
          <Button icon="arrow" onClick={() => openRecord(curr.id, 'V2')}>Buka hasil V2</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[prev, curr].map(d => (
          <GlassPanel key={d.version} variant="glass-strong" className="p-5">
            <div className="flex items-center gap-2"><Tag>{d.version}</Tag>{d.version === 'V2' && <Tag tone="neutral">Revisi terbaru</Tag>}</div>
            <p className="mt-2 break-words font-semibold">{d.docs[2]?.name || d.title}</p>
            <p className="mt-1 text-xs text-ink-3">{d.checkedAt}</p>
            <p className="mt-3 text-sm text-ink-2">{d.findings.filter(f => f.status === 'fulfilled').length} dari {d.findings.length} temuan terpenuhi</p>
          </GlassPanel>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2" aria-label="Perbandingan persentase">
        {scores.map(sc => (
          <GlassPanel key={sc.label} className="p-5">
            <p className="eyebrow mb-2">{sc.label}</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-semibold text-ink-3">{sc.a.pct}%</span>
              <Icon name="arrow" size={18} className="text-ink-3" />
              <span className="text-4xl font-semibold">{sc.b.pct}%</span>
              <span className="text-xs text-ink-3">{sc.b.pct - sc.a.pct > 0 ? '+' : ''}{sc.b.pct - sc.a.pct} poin</span>
            </div>
            <p className="mt-2 text-xs text-ink-3">V1: {sc.a.met}/{sc.a.total} terpenuhi · V2: {sc.b.met}/{sc.b.total} terpenuhi</p>
          </GlassPanel>
        ))}
      </div>
      <p className="text-xs text-ink-3">{SCORE_NOTE}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5"><p className="text-xs text-ink-3">Membaik</p><p className="text-3xl font-semibold">{improved.length}</p></div>
        <div className="surface p-5"><p className="text-xs text-ink-3">Perlu perhatian / berubah</p><p className="text-3xl font-semibold">{requiringAttention.length}</p></div>
        <div className="surface p-5"><p className="text-xs text-ink-3">Tidak berubah</p><p className="text-3xl font-semibold">{rows.filter(r => r.change === 'unchanged').length}</p></div>
      </div>

      <section className="surface overflow-hidden">
        <div className="p-5"><h2 className="text-lg font-semibold">Perubahan status setiap persyaratan</h2><p className="text-sm text-ink-3">Kriteria dipasangkan menurut rujukan/isi persyaratan, bukan urutan temuan.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-left text-sm">
            <thead><tr className="border-y border-navy/8 bg-canvas/70 text-xs text-ink-3">
              <th className="w-[42%] px-4 py-3">Temuan</th><th className="w-[16%] px-4 py-3">V1</th>
              <th className="w-[16%] px-4 py-3">V2</th><th className="w-[16%] px-4 py-3">Perubahan</th>
              <th className="w-[10%] px-4 py-3">Keparahan</th>
            </tr></thead>
            <tbody className="divide-y divide-navy/5">
              {rows.map(r => (
                <tr key={r.key}>
                  <td className="px-4 py-4 align-top"><p className="break-words font-semibold">{r.b?.title || r.a?.title}</p><p className="mt-1 text-xs text-ink-3">{r.b?.requirement?.ref || r.a?.requirement?.ref}</p></td>
                  <td className="px-4 py-4 align-top">{r.a ? <StatusBadge status={r.a.status} /> : '—'}</td>
                  <td className="px-4 py-4 align-top">{r.b ? <StatusBadge status={r.b.status} /> : '—'}</td>
                  <td className="px-4 py-4 align-top"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${changeMeta[r.change].cls}`}>{changeMeta[r.change].label}</span></td>
                  <td className="px-4 py-4 align-top">{r.b ? <SeverityBadge severity={r.b.severity} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {improved.length > 0 && <GlassPanel variant="glass-strong" className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Bukti pada persyaratan yang membaik</h2>
        <div className="mt-4 space-y-4">
          {improved.map(r => (
            <section key={r.key} className="surface !rounded-2xl p-4">
              <p className="mb-2 font-semibold">{r.b?.title || r.a?.title}</p>
              <p className="text-xs font-semibold text-ink-3">V1</p>
              <p className="mt-1 text-sm text-ink-2">{r.a?.evidence?.[0]?.excerpt || 'Bukti tidak tersedia di V1.'}</p>
              <p className="mt-3 text-xs font-semibold text-ink-3">V2</p>
              <p className="mt-1 text-sm text-ink-2">{r.b?.evidence?.[0]?.excerpt || 'Tidak ada kutipan bukti yang dikembalikan di V2.'}</p>
            </section>
          ))}
        </div>
      </GlassPanel>}
      <GlassPanel className="p-5">
        <p className="text-sm text-ink-2">Status dan temuan di V2 berasal dari pemeriksaan ulang n8n. Perubahan status tidak berarti persetujuan final manusia.</p>
      </GlassPanel>
    </div>
  )
}
