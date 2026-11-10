import { useEffect, useState } from 'react'
import type { ReviewData } from '../data/review'
import { STATUS_META, type FindingStatus } from '../data/status'
import { stepEyebrow } from '../data/screens'
import { useDemo, useHumanReview, useViewedReview } from '../state/DemoStore'
import { NoReviewState } from '../components/review/NoReviewState'
import { VersionSwitcher } from '../components/ui/VersionSwitcher'
import { EvidenceViewer } from '../components/review/EvidenceViewer'
import { Button } from '../components/ui/Button'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Callout, EmptyState } from '../components/ui/States'
import { StatusBadge, Tag } from '../components/ui/StatusBadge'

const options: { id: FindingStatus; hint: string }[] = [
  { id: 'fulfilled', hint: 'Bukti memenuhi persyaratan.' },
  { id: 'partial', hint: 'Sebagian, bukan seluruhnya, persyaratan terpenuhi.' },
  { id: 'not_found', hint: 'Tidak ada bukti yang dapat diterima.' },
  { id: 'needs_review', hint: 'Masih belum jelas. Diperlukan informasi tambahan.' },
]

const reasons = [
  'Notifikasi internal (09:18 UTC) sudah jelas, tetapi pembaruan ke pelanggan tidak memiliki waktu, kanal, atau audiens, sehingga batas waktu SOP 6.1 tidak dapat dicek dari laporan saja.',
  'Apakah satu kalimat penyebutan dapat dianggap notifikasi pelanggan yang tercatat adalah soal penilaian.',
  'Komunikasi ke pelanggan itu sendiri berada di luar ketiga dokumen yang diunggah.',
]

export function HumanReview({ onNavigate }: { onNavigate: (id: string) => void }) {
  const d = useViewedReview()
  if (!d) return <NoReviewState screen="Tinjauan manusia" />
  // A compliant review often has no 'needs_review' finding. Avoid reading
  // `finding.title` from undefined and preserve independent human approval.
  const pendingFinding = d.findings.find((f) => f.status === 'needs_review')
  if (!pendingFinding) {
    const applicable = [...d.sopAssessment, ...d.templateAssessment].filter((x) => x.status !== 'na')
    const clear = applicable.length > 0 && applicable.every((x) => x.status === 'fulfilled') && d.findings.every((f) => f.status === 'fulfilled' || f.status === 'na')
    return (
      <div className="space-y-5">
        <p className="eyebrow">Tinjauan manusia</p>
        <GlassPanel variant="glass-strong" className="p-5 sm:p-7">
          <EmptyState
            icon={clear ? 'check' : 'info'}
            title={clear ? 'Clear · Pemeriksaan awal terpenuhi' : 'Tidak ada temuan berstatus Perlu Ditinjau'}
            body={clear
              ? 'Semua kriteria SOP dan templat yang dievaluasi terpenuhi. Tidak ada temuan ambigu yang perlu diputuskan pada panel ini. Persetujuan akhir manusia, jika diwajibkan, tetap proses terpisah.'
              : 'Masih mungkin ada temuan Belum Terpenuhi atau Terpenuhi Sebagian. Periksa daftar temuan dan buktinya untuk menentukan tindak lanjut.'}
            action={<div className="mt-3 flex flex-wrap justify-center gap-2"><Button onClick={() => onNavigate('result')}>Lihat hasil tinjauan</Button><Button variant="glass" onClick={() => onNavigate('findings')}>Temuan dan jejak bukti</Button></div>}
          />
        </GlassPanel>
      </div>
    )
  }
  return <HumanBody key={`${d.id}-${d.version}`} d={d} onNavigate={onNavigate} />
}

function HumanBody({ d, onNavigate }: { d: ReviewData; onNavigate: (id: string) => void }) {
  const finding = d.findings.find((f) => f.status === 'needs_review')!
  const hr = useHumanReview()
  const demo = useDemo()
  const [notes, setNotes] = useState(hr.notes)
  const [decision, setDecision] = useState<FindingStatus | null>(hr.determination)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [evId, setEvId] = useState<string | null>(null)
  const prev = d.version === 'V2' ? demo.hrFor('V1') : null
  const locked = hr.status === 'reviewed'
  const dirty = !locked && (notes !== hr.notes || decision !== hr.determination)

  // Warn before leaving with unsaved notes (see UnsavedDialog).
  const { registerGuard } = demo
  useEffect(() => {
    registerGuard({ dirty, save: () => hr.saveDraft(notes, decision), discard: () => { setNotes(hr.notes); setDecision(hr.determination) } })
    return () => registerGuard(null)
  }, [dirty, notes, decision, registerGuard]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => { setError(null); hr.saveDraft(notes, decision); setSaved(true) }
  const submit = () => {
    if (!decision) return setError('Pilih keputusan Anda sendiri sebelum menandai temuan ini sebagai selesai ditinjau.')
    if (!notes.trim()) return setError('Tambahkan catatan peninjau yang menjelaskan keputusan Anda.')
    setError(null); setSaved(false); hr.markReviewed(notes.trim(), decision)
  }
  const reopen = () => { hr.reopen(); setSaved(false) }

  const statusChip = {
    pending: { t: 'Tinjauan menunggu', c: 'bg-review-soft text-review' },
    draft: { t: 'Catatan tersimpan, belum selesai ditinjau', c: 'bg-partial-soft text-partial' },
    reviewed: { t: 'Sudah ditinjau manusia', c: 'bg-ok-soft text-ok' },
  }[hr.status]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2">{stepEyebrow('human', 'Tinjauan manusia')}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{finding.title}</h1>
          <p className="mt-1.5 text-ink-2">AI tidak dapat memutuskan temuan ini. Periksa buktinya, lalu catat keputusan Anda sendiri.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Tag>{d.id}</Tag><Tag tone="neutral">{d.version}</Tag><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusChip.c}`}>{statusChip.t}</span></div>
        <div className="w-full"><VersionSwitcher /></div>
      </div>

      {prev && (
        <>
          {hr.status === 'pending' && <Callout tone="warning">Tinjauan manusia untuk {d.version} masih menunggu. {prev.status === 'reviewed' ? 'Tinjauan V1' : 'Catatan V1'} di bawah hanya sebagai konteks historis dan tidak menyetujui {d.version}. Diperlukan tindakan peninjau tersendiri.</Callout>}
          {prev.status !== 'pending' && (
            <section className="surface p-5" aria-label="Tinjauan manusia versi sebelumnya (historis, hanya baca)">
              <div className="flex flex-wrap items-center gap-2"><p className="eyebrow">Konteks historis · tinjauan manusia V1</p><Tag tone="neutral">Hanya baca</Tag>{prev.determination && <StatusBadge status={prev.determination} />}<span className="text-xs text-ink-3">{prev.status === 'reviewed' ? `Dicatat ${prev.at}` : 'Catatan draf, belum ditandai selesai ditinjau'}</span></div>
              <blockquote className="mt-3 mb-0 border-l-[3px] border-sage pl-3.5 text-sm text-ink-2">{prev.notes || 'Tidak ada catatan yang ditulis.'}</blockquote>
            </section>
          )}
        </>
      )}

      {/* AI vs human, deliberately separate */}
      <div className="grid gap-4 md:grid-cols-2" aria-label="Penilaian AI dan keputusan peninjau">
        <GlassPanel className="p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase"><Icon name="spark" size={15} />Penilaian AI · simulasi · tidak berubah</p>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={finding.status} /><SeverityBadge severity={finding.severity} /></div>
          <p className="mt-3 text-sm text-ink-3">Hasil AI tetap seperti saat dibuat. Keputusan peninjau dicatat di sampingnya, tidak pernah menimpanya.</p>
        </GlassPanel>
        <section className={`surface p-5 ${hr.status === 'reviewed' ? '!border-brand/40 ring-1 ring-brand/25' : 'border-dashed'}`}>
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase"><Icon name="user" size={15} />Keputusan peninjau · manusia</p>
          {hr.status === 'reviewed' && hr.determination ? (
            <>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={hr.determination} /><span className="rounded-md bg-brand px-2 py-0.5 text-xs font-semibold text-white">Dicatat oleh {hr.reviewer}</span></div>
              <p className="mt-3 text-sm text-ink-3">{hr.at}</p>
            </>
          ) : <p className="text-sm text-ink-3">Belum ada keputusan yang dicatat. Sampai peninjau bertindak, temuan ini tetap <strong className="text-ink">Perlu Ditinjau</strong>.</p>}
        </section>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <section className="surface p-5 sm:p-6">
            <p className="eyebrow mb-1">Persyaratan yang ditinjau</p>
            <p className="text-lg font-semibold tracking-tight">{finding.requirement.ref}</p>
            <p className="mt-1 text-ink-2">{finding.requirement.text}</p>
          </section>

          <GlassPanel variant="glass-strong" className="p-5 sm:p-6">
            <EvidenceViewer finding={finding} sopDoc={d.docs[0].name} evidenceId={evId} onSelect={setEvId} />
          </GlassPanel>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="surface p-5">
              <p className="eyebrow mb-2">Penjelasan AI tentang ambiguitas</p>
              <p className="text-sm leading-relaxed text-ink-2">{finding.explanation}</p>
            </section>
            <section className="surface p-5">
              <p className="eyebrow mb-2">Mengapa tinjauan manusia diperlukan</p>
              <ul className="space-y-2 text-sm text-ink-2">
                {reasons.map((r) => <li key={r} className="flex gap-2"><Icon name="info" size={16} className="mt-0.5 shrink-0 text-review" />{r}</li>)}
              </ul>
            </section>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:col-span-5" aria-label="Panel peninjau">
          <GlassPanel variant="glass-strong" className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Keputusan peninjau</h2>
            <p className="mt-0.5 text-sm text-ink-3">Meninjau sebagai {hr.reviewer}. Keputusan Anda independen dari AI.</p>

            <fieldset disabled={locked} className="mt-4 min-w-0 border-0 p-0">
              <legend className="mb-2 text-sm font-semibold">Keputusan Anda</legend>
              <div className="space-y-2">
                {options.map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${decision === o.id ? 'border-brand/60 bg-brand-soft/70' : 'border-navy/10 bg-paper hover:border-brand/30'} ${locked ? 'cursor-default opacity-80' : ''}`}>
                    <input type="radio" name="determination" checked={decision === o.id} onChange={() => setDecision(o.id)} className="mt-1 size-4 accent-[var(--color-brand)]" />
                    <span><span className="block text-sm font-semibold">{STATUS_META[o.id].label}</span><span className="block text-xs text-ink-3">{o.hint}</span></span>
                  </label>
                ))}
              </div>

              <label htmlFor="notes" className="mt-4 mb-1.5 block text-sm font-semibold">Catatan peninjau</label>
              <textarea id="notes" rows={5} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false) }} maxLength={600}
                placeholder="Jelaskan apa yang Anda periksa dan mengapa Anda mengambil keputusan ini."
                aria-describedby="notes-help" aria-invalid={!!error && !notes.trim()}
                className="w-full resize-y rounded-xl border border-navy/15 bg-paper p-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-canvas" />
              <p id="notes-help" className="mt-1 text-right text-xs text-ink-3">{notes.length} / 600</p>
            </fieldset>

            <div className="mt-3 space-y-3" aria-live="polite">
              {error && <Callout tone="error">{error}</Callout>}
              {dirty && !error && <Callout tone="warning">Ada perubahan yang belum disimpan. Simpan catatan atau tandai selesai ditinjau agar tidak hilang.</Callout>}
              {saved && !error && hr.status === 'draft' && <Callout tone="warning">Catatan tersimpan. Temuan ini belum ditandai selesai ditinjau.</Callout>}
              {locked && <Callout tone="success">Tinjauan dicatat oleh {hr.reviewer} pada {hr.at}. Penilaian AI tidak diubah.</Callout>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {locked ? <Button variant="glass" icon="refresh" onClick={reopen}>Edit tinjauan</Button> : (
                <>
                  <Button icon="check" onClick={submit}>Tandai Selesai Ditinjau</Button>
                  <Button variant="glass" onClick={save}>Simpan Catatan Tinjauan</Button>
                </>
              )}
            </div>
          </GlassPanel>

          <section className="surface p-5" aria-label="Aktivitas tinjauan">
            <p className="eyebrow mb-3">Aktivitas</p>
            <ol className="space-y-3">
              {hr.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${e.by === 'ai' ? 'bg-navy/8 text-ink-3' : 'bg-brand text-white'}`}><Icon name={e.by === 'ai' ? 'spark' : 'user'} size={13} /></span>
                  <div><p className="font-semibold">{e.label}</p><p className="text-xs text-ink-3">{e.by === 'ai' ? 'AI (simulasi)' : hr.reviewer} · {e.at}{e.detail ? ` · ${e.detail}` : ''}</p></div>
                </li>
              ))}
            </ol>
          </section>

          <GlassPanel className="p-5">
            <p className="eyebrow mb-1">Langkah berikutnya</p>
            {demo.reviews.V2
              ? <><p className="text-sm text-ink-2">V2 sudah ada. Bandingkan dengan V1 untuk melihat apa yang diubah revisi.</p><Button className="mt-3" variant="glass" icon="compare" onClick={() => onNavigate('compare')}>Bandingkan V1 dan V2</Button></>
              : <><p className="text-sm text-ink-2">Akar Masalah baru terpenuhi sebagian. Revisi dengan bukti pendukung lalu periksa ulang untuk membuat V2.</p><Button className="mt-3" icon="refresh" onClick={demo.openRevision}>Revisi akar masalah</Button></>}
          </GlassPanel>

          <div className="flex flex-wrap gap-2">
            <Button variant="glass" onClick={() => onNavigate('findings')}>Kembali ke jejak bukti</Button>
            <Button variant="ghost" onClick={() => onNavigate('result')}>Hasil tinjauan</Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
