import { useEffect, useState } from 'react'
import { journey, user } from '../data/dashboard'
import { useDemo } from '../state/DemoStore'
import { REVIEW_STATE_META as stateLabel, STATUS_META, type FindingStatus } from '../data/status'
import { useTypewriter } from '../hooks/useTypewriter'
import { Button } from '../components/ui/Button'
import { GlassPanel, SectionHeader } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { FloatingShield } from '../components/ui/FloatingShield'
import { ScoreRing } from '../components/ui/ScoreRing'
import { Callout, EmptyState, Skeleton } from '../components/ui/States'
import { StatusBadge, Tag } from '../components/ui/StatusBadge'

// Type the headline only the first time the dashboard loads in a session.
let headlinePlayed = false

function TypedHeadline({ text }: { text: string }) {
  const [first] = useState(() => !headlinePlayed)
  const { typed, done } = useTypewriter(text, { speed: 55, enabled: first })
  useEffect(() => { if (done) headlinePlayed = true }, [done])
  return (
    <h1 aria-label={text} className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
      <span aria-hidden="true">
        {typed}
        <span className="invisible">{text.slice(typed.length)}</span>
        <span className="caret" aria-hidden="true" />
      </span>
    </h1>
  )
}

const compactId = (value: string) => value.length > 15 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value

const statusOrder: FindingStatus[] = ['fulfilled', 'partial', 'not_found', 'needs_review', 'na']

export function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const demo = useDemo()
  const { reviews, latestVersion, history, visited, allReady, anyReviewed, current } = demo
  const latestHr = latestVersion ? demo.hrFor(latestVersion) : null
  const caseId = current?.id ?? 'Tinjauan saat ini'
  const r = latestVersion ? reviews[latestVersion]! : null
  const open = r ? r.findings.filter((f) => f.status !== 'fulfilled' && f.status !== 'na') : []
  const counts = r ? statusOrder.map((s) => ({ status: s, count: r.findings.filter((f) => f.status === s).length })).filter((c) => c.count) : []
  const awaiting = history.filter((h) => h.latest && h.status === 'awaiting_human').length
  const kpis = [
    { id: 'incidents', label: 'Insiden dalam riwayat', value: String(new Set(history.map((h) => h.id)).size), delta: `${history.length} versi tinjauan`, trend: 'flat', icon: 'file' },
    { id: 'awaiting', label: 'Menunggu tinjauan manusia', value: String(awaiting), delta: 'Hanya versi terbaru', trend: awaiting ? 'warn' : 'flat', icon: 'user' },
    { id: 'open', label: `Temuan terbuka, ${caseId}`, value: r ? String(open.length) : '—', delta: r ? `${open.filter((f) => f.status === 'needs_review').length} memerlukan keputusan manusia` : 'Belum ada tinjauan dibuat', trend: 'flat', icon: 'flag' },
    { id: 'versions', label: `Versi ${caseId}`, value: String(Object.keys(reviews).length), delta: reviews.V2 ? 'V1 dan V2 tersimpan' : reviews.V1 ? 'Hanya V1' : 'Belum ada', trend: reviews.V2 ? 'up' : 'flat', icon: 'history' },
  ]
  const next = !reviews.V1 ? { label: 'Periksa laporan baru', run: () => onNavigate('new') }
    : !visited.findings ? { label: 'Periksa temuan', run: () => onNavigate('findings') }
    : !anyReviewed ? { label: 'Catat tinjauan manusia', run: () => onNavigate('human') }
    : !reviews.V2 ? { label: 'Revisi akar masalah', run: demo.openRevision }
    : !visited.compare ? { label: 'Bandingkan V1 dan V2', run: () => onNavigate('compare') }
    : { label: 'Buka riwayat tinjauan', run: () => onNavigate('history') }
  const steps = [
    { l: 'Unggah tiga dokumen', done: allReady || !!reviews.V1 },
    { l: 'Jalankan tinjauan AI simulasi (V1)', done: !!reviews.V1 },
    { l: 'Periksa temuan dan bukti', done: visited.findings },
    { l: 'Catat tinjauan manusia', done: anyReviewed },
    { l: 'Revisi akar masalah dan periksa ulang (V2)', done: !!reviews.V2 },
    { l: 'Bandingkan V1 dan V2', done: !!reviews.V2 && visited.compare },
  ]
  const sopApplicable = r ? r.sopAssessment.filter((i) => i.status !== 'na') : []
  const tplApplicable = r ? r.templateAssessment.filter((i) => i.status !== 'na') : []
  const sopTotal = sopApplicable.length, tplTotal = tplApplicable.length
  const sopMet = sopApplicable.filter((i) => i.status === 'fulfilled').length
  const tplMet = tplApplicable.filter((i) => i.status === 'fulfilled').length
  const sopPct = sopTotal ? Math.round((sopMet / sopTotal) * 100) : 0
  const tplPct = tplTotal ? Math.round((tplMet / tplTotal) * 100) : 0
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t) }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Selasa, 9 Juni 2026</p>
          <TypedHeadline text={`Selamat pagi, ${user.firstName}`} />
          <p className="mt-1.5 text-ink-2">{awaiting === 0 ? 'Tidak ada tinjauan yang menunggu peninjau manusia.' : `${awaiting} tinjauan menunggu peninjau manusia.`}</p>
        </div>
        <Button icon="upload" onClick={() => onNavigate('new')} className="sm:hidden">Tinjauan Baru</Button>
      </div>

      {/* Hero + attention */}
      <div className="grid gap-5 xl:grid-cols-12">
        <GlassPanel variant="glass-strong" sheen className="p-5 sm:p-7 xl:col-span-8" aria-labelledby="latest-h">
          {loading ? <HeroSkeleton /> : !r ? (
            <EmptyState icon="shield" title="Belum ada tinjauan dibuat" body="Unggah SOP, templat, dan laporan insiden untuk menjalankan tinjauan simulasi, atau muat tinjauan demo INC-2026-014."
              action={<div className="mt-2 flex flex-wrap justify-center gap-2"><Button icon="upload" onClick={() => onNavigate('new')}>Mulai tinjauan baru</Button><Button variant="glass" onClick={demo.loadDemoReview}>Muat tinjauan demo</Button></div>} />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow mb-2">Tinjauan terbaru</p>
                  <h2 id="latest-h" className="max-w-full break-words text-2xl font-semibold tracking-tight">{r.title}</h2>
                  <p className="mt-1 text-sm text-ink-3" title={r.id}>ID review: {compactId(r.id)}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Tag>{r.version}</Tag><Tag tone="neutral">{r.domain}</Tag><Tag tone="neutral">{r.checkedAt}</Tag><Tag tone="neutral">Data demonstrasi</Tag></div>
                </div>
                <div className="-mt-3 -mr-2 hidden shrink-0 sm:block"><FloatingShield /></div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Persentase kepatuhan">
                  <div className="surface flex min-w-0 flex-col items-center justify-start p-5 text-center">
                    <ScoreRing value={sopPct} display={`${sopPct}%`} label="Kesesuaian SOP" size={136} />
                    <p className="mt-2 text-sm text-ink-3">{sopMet} dari {sopTotal} terpenuhi</p>
                  </div>
                  <div className="surface flex min-w-0 flex-col items-center justify-start p-5 text-center">
                    <ScoreRing value={tplPct} display={`${tplPct}%`} label="Kelengkapan templat" size={136} from="#A8C9B4" to="#1C5945" />
                    <p className="mt-2 text-sm text-ink-3">{tplMet} dari {tplTotal} terpenuhi</p>
                  </div>
                </div>

                <div className="surface p-4 sm:p-5">
                  <p className="eyebrow mb-3">Temuan tahap pertama</p>
                  <ul className="divide-y divide-navy/5">
                    {r.findings.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm sm:flex-nowrap">
                        <span className="min-w-0 flex-1 break-words font-medium text-ink">{f.title}</span>
                        <span className="shrink-0"><StatusBadge status={f.status} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button icon="arrow" onClick={() => onNavigate('result')}>Buka hasil tinjauan</Button>
                <Button variant="glass" onClick={() => onNavigate('history')}>Lihat riwayat</Button>
                <span className="text-xs text-ink-3">Kepatuhan SOP dan kelengkapan templat dihitung terpisah.</span>
              </div>
            </>
          )}
        </GlassPanel>

        <div className="grid content-start gap-5 xl:col-span-4">
          <GlassPanel className="p-5">
            <SectionHeader eyebrow="Antrean" title="Perlu perhatian Anda" />
            {loading ? <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
              : !r ? <p className="text-sm text-ink-3">Belum ada yang ditinjau. Buat tinjauan untuk melihat temuan terbuka di sini.</p>
              : open.length === 0 ? <p className="text-sm text-ink-3">Semua temuan terpenuhi. Tidak ada yang perlu perhatian.</p> : (
              <ul className="space-y-2.5">
                {open.map((f) => (
                  <li key={f.id} className="surface lift flex gap-3 !rounded-2xl p-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: STATUS_META[f.status].fg }} />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-ink">{f.title}</p>
                      <p className="mt-0.5 text-xs text-ink-3">{compactId(r.id)} {r.version} · {STATUS_META[f.status].label}{f.status === 'needs_review' && latestHr?.status === 'reviewed' ? ' · Tinjauan manusia tercatat' : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <SectionHeader eyebrow="Peta jalan" title="Alur tinjauan" />
            <ol className="grid grid-cols-2 gap-2">
              {journey.map((j) => (
                <li key={j.n} className={`lift flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold ${j.phase === 'live' ? 'bg-brand text-white' : 'glass-inset text-ink-3'}`}>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${j.phase === 'live' ? 'bg-white/25' : 'bg-navy/8'}`}>{j.n}</span>
                  {j.label}
                </li>
              ))}
            </ol>
          </GlassPanel>
        </div>
      </div>

      {/* KPI strip: one continuous glass band rather than four repeated cards */}
      <GlassPanel className="grid grid-cols-2 lg:grid-cols-4 !rounded-[1.75rem]" aria-label="Metrik utama">
        {kpis.map((k, i) => (
          <div key={k.id} className={`p-5 ${i % 2 ? 'border-l border-navy/8' : ''} ${i > 1 ? 'border-t border-navy/8 lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l lg:border-navy/8' : ''}`}>
            <div className="flex items-center gap-2 text-ink-3"><Icon name={k.icon} size={16} /><span className="text-xs font-semibold">{k.label}</span></div>
            {loading ? <Skeleton className="mt-3 h-9 w-20" /> : <p className="mt-2 text-3xl font-semibold tracking-tight">{k.value}</p>}
            <p className={`mt-1 text-xs font-semibold ${k.trend === 'up' ? 'text-ok' : k.trend === 'warn' ? 'text-partial' : 'text-ink-3'}`}>{k.delta}</p>
          </div>
        ))}
      </GlassPanel>

      <div className="grid gap-5 xl:grid-cols-12">
        <GlassPanel className="p-5 sm:p-6 xl:col-span-7">
          <SectionHeader eyebrow="Demonstrasi" title="Progres alur demo" action={<Button variant="ghost" className="!min-h-9 !px-3" icon="refresh" onClick={demo.requestReset}>Reset demo</Button>} />
          <ol className="grid gap-2 sm:grid-cols-2">
            {steps.map((st, i) => (
              <li key={st.l} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${st.done ? 'bg-brand-soft text-brand' : 'glass-inset text-ink-2'}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${st.done ? 'bg-brand text-white' : 'bg-navy/8 text-ink-3'}`}>{st.done ? <Icon name="check" size={13} /> : i + 1}</span>{st.l}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3"><Button icon="arrow" onClick={next.run}>{next.label}</Button><span className="text-xs text-ink-3">Mengikuti seluruh demo dari unggah hingga perbandingan versi.</span></div>
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6 xl:col-span-5">
          <SectionHeader eyebrow={r ? `${r.id} · ${r.version}` : 'Belum ada tinjauan'} title="Kategori temuan" />
          {!r ? <p className="text-sm text-ink-3">Kategori temuan muncul setelah tinjauan dibuat.</p> : (
            <>
              <div className="flex h-4 overflow-hidden rounded-full bg-navy/5" role="img" aria-label="Distribusi kategori temuan">
                {counts.map((d) => <div key={d.status} style={{ width: `${(d.count / r.findings.length) * 100}%`, background: STATUS_META[d.status].fg }} />)}
              </div>
              <ul className="mt-5 space-y-2.5">
                {counts.map((d) => (
                  <li key={d.status} className="flex items-center gap-3 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: STATUS_META[d.status].fg }} />
                    <span className="flex-1 font-medium text-ink-2">{STATUS_META[d.status].label}</span>
                    <span className="font-semibold tabular-nums">{d.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </GlassPanel>
      </div>

      {/* Dense data: solid surface */}
      <section className="surface overflow-hidden" aria-labelledby="recent-h">
        <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3">
          <div><p className="eyebrow mb-1">Aktivitas</p><h2 id="recent-h" className="text-lg font-semibold tracking-tight">Tinjauan terbaru</h2></div>
          <Button variant="ghost" onClick={() => onNavigate('history')}>Lihat semua</Button>
        </div>
        {history.length === 0 ? <EmptyState title="Belum ada tinjauan" body="Unggah SOP, templat, dan laporan insiden untuk memulai tinjauan pertama Anda." action={<Button onClick={() => onNavigate('new')}>Mulai tinjauan</Button>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-y border-navy/8 bg-canvas/70 text-xs text-ink-3">
                {['Laporan', 'Versi', 'SOP', 'Templat', 'Status', 'Ditinjau', ''].map((h, i) => <th key={i} scope="col" className="px-5 py-2.5 font-semibold sm:first:pl-6">{h || <span className="sr-only">Aksi</span>}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-navy/5">
                {history.slice(0, 5).map((v) => (
                  <tr key={v.key} className="transition-colors hover:bg-brand-soft/70">
                    <td className="px-5 py-3.5 sm:pl-6"><p className="font-semibold">{v.id}</p><p className="text-xs text-ink-3">{v.title}</p></td>
                    <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5"><Tag tone="neutral">{v.version}</Tag>{v.latest && <Tag>Terbaru</Tag>}</span></td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums">{v.sop !== undefined ? `${v.sop}%` : <span className="font-normal text-ink-3">—</span>}</td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums">{v.tpl !== undefined ? `${v.tpl}%` : <span className="font-normal text-ink-3">—</span>}</td>
                    <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${stateLabel[v.status].cls}`}>{stateLabel[v.status].text}</span></td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-ink-3">{v.date}</td>
                    <td className="px-5 py-3.5 text-right"><Button variant="ghost" className="!min-h-9 !px-3" onClick={() => demo.openRecord(v.id, v.version)} aria-label={`Lihat hasil ${v.id} ${v.version}`}>Lihat</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Callout tone="info">
        <strong>Prototipe simulasi.</strong> DocuGuard AI adalah peninjau tahap pertama, bukan auditor final. Persentase dan temuan yang ditampilkan adalah data dummy; cakupan MVP hanya PDF dan DOCX berbasis teks (tanpa OCR).
      </Callout>
    </div>
  )
}

function HeroSkeleton() {
  return <div className="space-y-4" aria-busy="true" aria-label="Memuat tinjauan terbaru"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-56" /><div className="flex gap-4"><Skeleton className="size-28 !rounded-full" /><Skeleton className="size-28 !rounded-full" /><Skeleton className="h-28 flex-1" /></div></div>
}
