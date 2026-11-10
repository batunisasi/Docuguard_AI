import { useEffect } from 'react'
import { slotMeta, stages } from '../data/review'
import { stepEyebrow } from '../data/screens'
import { useDemo } from '../state/DemoStore'
import { Button } from '../components/ui/Button'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { Callout, EmptyState } from '../components/ui/States'
import { scoreOf } from '../lib/score'

export function AIProcessing() {
  const { processing: p, slots, reviews, current, navigate, setFailDemo, retryProcessing, skipProcessing, loadSamples } = useDemo()
  const { step, status } = p
  const finished = status === 'done'
  const failed = status === 'failed'
  const running = status === 'running'
  const recheck = p.mode === 'recheck'
  const doneReview = current ? current.reviews[current.reviews.V2 ? 'V2' : 'V1'] : undefined
  const sopScore = doneReview ? scoreOf(doneReview.sopAssessment) : null
  const tplScore = doneReview ? scoreOf(doneReview.templateAssessment) : null
  const locked = step >= 2 // text extraction (stage 2) has passed

  // Completed: show the success state briefly, then open the result automatically.
  useEffect(() => {
    if (!finished) return
    const t = setTimeout(() => navigate('result'), 1600)
    return () => clearTimeout(t)
  }, [finished, navigate])

  if (status === 'idle') {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <GlassPanel variant="glass-strong">
          <EmptyState icon="spark" title="Tidak ada tinjauan yang sedang diproses"
            body="Pemrosesan dimulai saat Anda memilih Mulai Tinjauan AI setelah mengunggah SOP, templat, dan laporan insiden."
            action={<div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('new')} icon="upload">Unggah dokumen</Button>
              {reviews.V1 ? <Button variant="glass" onClick={() => navigate('result')}>Buka hasil terbaru</Button> : <Button variant="glass" onClick={loadSamples}>Pakai dokumen contoh</Button>}
            </div>} />
        </GlassPanel>
      </div>
    )
  }

  const heading = finished ? (recheck ? 'V2 siap' : 'Hasil tinjauan siap') : failed ? 'Pemrosesan berhenti' : recheck ? 'Memeriksa ulang laporan revisi' : 'Tinjauan AI sedang berjalan'
  const doneNote = (i: number) => recheck && i === 5 ? '6 temuan diklasifikasi ulang. Hanya Akar Masalah yang berubah' : stages[i].done

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{recheck ? 'Pemeriksaan ulang · membuat V2' : stepEyebrow('processing', 'Pemrosesan AI')}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
        <p className="mt-1.5 text-ink-2">
          {finished ? 'Membuka hasil tinjauan…'
            : failed ? 'Satu tahap tidak dapat diselesaikan. Coba lagi untuk melanjutkan.'
            : `Tahap ${Math.min(step + 1, stages.length)} dari ${stages.length}: ${stages[Math.min(step, stages.length - 1)].label}.`}
        </p>
      </div>

      <Callout tone="info"><strong>Terhubung dengan backend DocuGuard.</strong> Dokumen diunggah, diekstraksi, lalu diperiksa melalui n8n dan Gemini. Tahapan yang ditampilkan menunjukkan progres permintaan, bukan progres internal tiap node n8n.</Callout>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <GlassPanel variant="glass-strong" className="p-5 sm:p-7 xl:col-span-7" aria-label="Tahap pemrosesan">
          <ol className="relative">
            {stages.map((s, i) => {
              const state = i < step ? 'done' : i === step ? (failed ? 'failed' : finished ? 'done' : 'active') : 'pending'
              const last = i === stages.length - 1
              return (
                <li key={s.id} className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === 'active' ? 'step' : undefined}>
                  {!last && <span aria-hidden="true" className={`absolute top-10 bottom-0 left-[19px] w-0.5 rounded ${i < step ? 'bg-brand' : 'bg-navy/10'}`} />}
                  <StageDot state={state} n={i + 1} />
                  <div className="min-w-0 flex-1 pt-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold ${state === 'pending' ? 'text-ink-3' : 'text-ink'}`}>{s.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        state === 'done' ? 'bg-ok-soft text-ok' : state === 'active' ? 'bg-brand-soft text-brand' : state === 'failed' ? 'bg-missing-soft text-missing' : 'bg-navy/5 text-ink-3'}`}>
                        {{ done: 'Selesai', active: 'Berjalan', failed: 'Gagal', pending: 'Menunggu' }[state]}
                      </span>
                    </div>
                    {state !== 'pending' && (
                      <p className={`mt-0.5 text-sm ${state === 'failed' ? 'text-missing' : 'text-ink-3'}`}>
                        {state === 'done' ? doneNote(i) : state === 'failed' ? 'Permintaan ke backend atau n8n gagal. Periksa notifikasi galat dan log server.' : `${s.active}…`}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </GlassPanel>

        <div className="space-y-5 xl:sticky xl:top-5 xl:col-span-5">
          <GlassPanel className="p-5">
            <p className="eyebrow mb-3">{recheck ? 'Dokumen dalam pemeriksaan ulang' : 'Dokumen dalam tinjauan'}</p>
            <ul className="space-y-2">
              {slotMeta.map((m, i) => {
                const name = recheck || finished ? (recheck ? reviews.V1 : current?.reviews.V1)?.docs[i].name : slots[m.id].file?.name
                return (
                  <li key={m.id} className="glass-inset flex items-center gap-3 px-3 py-2.5">
                    <Icon name="doc" size={18} className="text-brand" />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{recheck && m.id === 'report' ? name?.replace(/(\.\w+)$/, '_rev2$1') : name}</p><p className="text-xs text-ink-3">{m.title}{recheck && m.id === 'report' ? ' · revisi' : ''}</p></div>
                  </li>
                )
              })}
            </ul>

            <div className="surface relative mt-4 h-40 overflow-hidden !rounded-2xl p-4" aria-hidden="true">
              <div className="space-y-2.5">{[88, 100, 72, 94, 60, 82].map((w, i) => <i key={i} className="block h-2 rounded bg-navy/10" style={{ width: `${w}%` }} />)}</div>
              {running && <span className="scanline" />}
              {finished && <div className="absolute inset-0 grid place-items-center bg-paper/70"><span className="grid size-12 place-items-center rounded-full bg-brand text-white"><Icon name="check" size={24} /></span></div>}
              {failed && <div className="absolute inset-0 grid place-items-center bg-paper/70"><span className="grid size-12 place-items-center rounded-full bg-missing text-white"><Icon name="alert" size={24} /></span></div>}
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-3">Pratinjau ilustrasi. Bukan tampilan dokumen sebenarnya.</p>
          </GlassPanel>

          <GlassPanel variant="glass-strong" className="space-y-3 p-5">
            {finished ? (
              <>
                <Callout tone="success">Ketujuh tahap selesai. Hasil perlu ditinjau manusia sebelum final.</Callout>
                {sopScore && tplScore && (
                  <div className="grid grid-cols-2 gap-2 text-center" aria-label="Persentase kesesuaian">
                    <div className="glass-inset p-3"><p className="text-2xl font-semibold tracking-tight">{sopScore.pct}%</p><p className="text-xs font-semibold text-ink-3">Kesesuaian SOP</p></div>
                    <div className="glass-inset p-3"><p className="text-2xl font-semibold tracking-tight">{tplScore.pct}%</p><p className="text-xs font-semibold text-ink-3">Kelengkapan templat</p></div>
                  </div>
                )}
                <Button className="w-full" icon="arrow" onClick={() => navigate('result')}>Lihat hasil tinjauan sekarang</Button>
              </>
            ) : failed ? (
              <>
                <Callout tone="error">Ekstraksi teks gagal pada simulasi ini. Coba lagi, atau kembali dan ganti dokumen.</Callout>
                <Button className="w-full" icon="refresh" onClick={retryProcessing}>Coba lagi dari tahap ini</Button>
                <Button className="w-full" variant="glass" onClick={() => navigate(recheck ? 'result' : 'new')}>{recheck ? 'Kembali ke hasil tinjauan' : 'Ganti dokumen'}</Button>
              </>
            ) : (
              <>
                <label className={`flex items-start gap-3 text-sm ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={p.failDemo} disabled={locked} onChange={(e) => setFailDemo(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)] disabled:opacity-50" />
                  <span><span className="font-semibold">Demo: simulasikan galat ekstraksi</span><span className="block text-xs text-ink-3">{locked ? 'Terkunci: ekstraksi teks sudah selesai. Mulai proses baru untuk memakainya lagi.' : 'Berhenti di ekstraksi teks untuk menampilkan kondisi gagal dan coba lagi.'}</span></span>
                </label>
                <Button className="w-full" variant="glass" onClick={skipProcessing}>Lewati simulasi</Button>
              </>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}

function StageDot({ state, n }: { state: 'done' | 'active' | 'pending' | 'failed'; n: number }) {
  const base = 'relative z-10 grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold'
  if (state === 'done') return <span className={`${base} bg-brand text-white`}><Icon name="check" size={18} /></span>
  if (state === 'failed') return <span className={`${base} bg-missing text-white`}><Icon name="alert" size={18} /></span>
  if (state === 'active')
    return (
      <span className={`${base} bg-paper text-brand ring-2 ring-brand/25`}>
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand motion-reduce:animate-none" />
        {n}
      </span>
    )
  return <span className={`${base} border border-navy/15 bg-paper/60 text-ink-3`}>{n}</span>
}
