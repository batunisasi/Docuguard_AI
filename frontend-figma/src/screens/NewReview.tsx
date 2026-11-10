import { useCallback, useEffect, useState } from 'react'
import { slotMeta } from '../data/review'
import { stepEyebrow } from '../data/screens'
import { useDemo } from '../state/DemoStore'
import { UploadSlot } from '../components/upload/UploadSlot'
import { Button } from '../components/ui/Button'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { Callout } from '../components/ui/States'
import { fetchReferences, uploadReference, type ReportType, type ReferenceRecord } from '../lib/backend'

const categories: { id: ReportType; title: string; description: string }[] = [
  { id: 'incident', title: 'Laporan Insiden', description: 'Pemeriksaan laporan insiden TI / operasional' },
  { id: 'sales', title: 'Laporan Penjualan', description: 'Pemeriksaan laporan penjualan' },
  { id: 'budget', title: 'Laporan Anggaran', description: 'Pemeriksaan laporan anggaran' },
]

export function NewReview({ onNavigate: _onNavigate }: { onNavigate: (id: string) => void }) {
  const { slots, addFile, removeFile, startReview, textConfirmed, setTextConfirmed, processing } = useDemo()
  const [reportType, setReportType] = useState<ReportType>('incident')
  const [references, setReferences] = useState<ReferenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [referenceError, setReferenceError] = useState('')
  const [uploading, setUploading] = useState<'sop' | 'template' | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<{ sop: File | null; template: File | null }>({ sop: null, template: null })
  const [referenceNotice, setReferenceNotice] = useState('')

  const refreshReferences = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchReferences()
      setReferences(Array.isArray(result.items) ? result.items : [])
      setReferenceError('')
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : 'Gagal memuat referensi dari backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refreshReferences() }, [refreshReferences])
  const active = (kind: 'sop' | 'template') => references.find(r => r.report_type === reportType && r.document_kind === kind && r.is_active)
  const sop = active('sop'), template = active('template')
  const readyReferences = Boolean(sop && template) && !referenceError
  const report = slots.report
  const readyReport = report.status === 'ready'
  const isRunning = processing.status === 'running'

  const saveReference = async (kind: 'sop' | 'template') => {
    const file = uploadFiles[kind]
    if (!file) return
    const agreed = window.confirm(`Aktifkan ${kind === 'sop' ? 'SOP' : 'template'} baru untuk ${categories.find(c => c.id === reportType)?.title}? Referensi lama tetap ada sebagai arsip.`)
    if (!agreed) return
    setUploading(kind)
    setReferenceError('')
    setReferenceNotice('')
    try {
      await uploadReference(file, kind, reportType)
      await refreshReferences()
      setUploadFiles(old => ({ ...old, [kind]: null }))
      setReferenceNotice(`${kind === 'sop' ? 'SOP' : 'Template'} versi terbaru berhasil disimpan dan dijadikan referensi aktif.`)
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : 'Gagal memperbarui dokumen referensi.')
    } finally {
      setUploading(null)
    }
  }

  const start = () => {
    if (!readyReferences || !readyReport || !textConfirmed || isRunning) return
    startReview(reportType)
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="eyebrow mb-2">{stepEyebrow('new', 'Tinjauan baru')}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Periksa laporan baru</h1>
        <p className="mt-2 text-ink-2">Pilih kategori, lalu unggah <strong>laporan saja</strong>. Sistem mengambil SOP dan template aktif yang sudah tersimpan pada database, kemudian mengirimkannya ke n8n + Gemini untuk dibandingkan.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-12 xl:items-start">
        <div className="space-y-5 xl:col-span-8">
          <GlassPanel className="p-5 sm:p-6">
            <p className="eyebrow mb-3">1 / Jenis laporan</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {categories.map(category => (
                <button key={category.id} type="button" onClick={() => { setReportType(category.id); setReferenceNotice('') }}
                  aria-pressed={reportType === category.id}
                  className={`rounded-2xl border p-4 text-left transition ${reportType === category.id ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand/25' : 'border-navy/10 bg-paper text-ink hover:border-brand/40'}`}>
                  <span className="block text-sm font-semibold">{category.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-3">{category.description}</span>
                </button>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><p className="eyebrow mb-1">2 / Referensi tersimpan</p><h2 className="text-xl font-semibold">SOP & Template Aktif</h2></div>
              <Button variant="glass" onClick={() => setManageOpen(!manageOpen)}>{manageOpen ? 'Tutup pengelolaan' : 'Kelola / Perbarui Referensi'}</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['sop', 'template'] as const).map(kind => {
                const item = active(kind)
                return <div key={kind} className="glass-inset min-w-0 p-4">
                  <div className="mb-2 flex items-center gap-2"><Icon name={item ? 'check' : 'alert'} className={item ? 'text-ok' : 'text-partial'} /><strong>{kind === 'sop' ? 'Dokumen SOP' : 'Template Laporan'}</strong></div>
                  {loading ? <span className="text-sm text-ink-3">Mengambil data dari backend…</span> : item ? <>
                    <p className="break-all text-sm font-semibold">{item.original_filename}</p>
                    <p className="mt-2 text-xs text-ink-3">Versi {item.version_no} · Aktif · Disimpan di PostgreSQL</p>
                  </> : <p className="text-sm text-partial">Belum ada referensi aktif untuk kategori ini.</p>}
                </div>
              })}
            </div>
            {referenceError && <div className="mt-3"><Callout tone="error">{referenceError}</Callout></div>}
            {referenceNotice && <div className="mt-3"><Callout tone="success">{referenceNotice}</Callout></div>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-3">File referensi diunggah sekali untuk setiap kategori dan dapat diperbarui. Versi lama diarsipkan oleh backend.</p>
              <Button variant="ghost" className="!min-h-9" onClick={() => void refreshReferences()}>Muat Ulang Referensi</Button>
            </div>
            {manageOpen && <div className="mt-5 space-y-4 border-t border-navy/10 pt-5">
              <p className="text-sm font-semibold">Perbarui referensi untuk {categories.find(c => c.id === reportType)?.title}</p>
              {(['sop', 'template'] as const).map(kind => <div key={kind} className="rounded-xl border border-navy/10 bg-paper p-4">
                <label htmlFor={`master-${kind}`} className="mb-2 block text-sm font-semibold">Upload {kind === 'sop' ? 'SOP' : 'Template'} (PDF / DOCX)</label>
                <input id={`master-${kind}`} type="file" accept=".pdf,.docx" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:p-2 file:text-brand"
                  onChange={e => setUploadFiles(old => ({ ...old, [kind]: e.target.files?.[0] || null }))} />
                <Button className="mt-3" disabled={!uploadFiles[kind] || Boolean(uploading)} onClick={() => void saveReference(kind)}>{uploading === kind ? 'Menyimpan…' : `Simpan ${kind === 'sop' ? 'SOP' : 'Template'} Baru`}</Button>
              </div>)}
            </div>}
          </GlassPanel>

          <div>
            <p className="eyebrow mb-3">3 / Unggah laporan yang ingin diperiksa</p>
            <UploadSlot meta={{ ...slotMeta.find(m => m.id === 'report')!, title: categories.find(c => c.id === reportType)?.title || 'Laporan', hint: 'Upload satu laporan PDF atau DOCX untuk pemeriksaan kategori yang dipilih.' }} slot={report}
              onFile={file => addFile('report', file.name, file.size, { lastModified: file.lastModified, file })}
              onRemove={() => removeFile('report')} />
          </div>
        </div>

        <aside className="xl:sticky xl:top-5 xl:col-span-4">
          <GlassPanel variant="glass-strong" className="p-5">
            <p className="eyebrow mb-1">Pengaturan pemeriksaan</p>
            <h2 className="text-lg font-semibold">{categories.find(c => c.id === reportType)?.title}</h2>
            <p className="mt-2 text-sm text-ink-3">Referensi aktif dipilih otomatis dari database berdasarkan jenis laporan.</p>
            <div className="mt-4 space-y-3 text-sm">
              <p className={sop ? 'text-ok' : 'text-partial'}>{sop ? '✓' : '○'} SOP {sop ? `versi ${sop.version_no} siap` : 'belum tersedia'}</p>
              <p className={template ? 'text-ok' : 'text-partial'}>{template ? '✓' : '○'} Template {template ? `versi ${template.version_no} siap` : 'belum tersedia'}</p>
              <p className={readyReport ? 'text-ok' : 'text-ink-3'}>{readyReport ? '✓' : '○'} Laporan {readyReport ? 'siap' : 'belum dipilih'}</p>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-navy/10 bg-paper/70 p-3 text-sm">
              <input type="checkbox" checked={textConfirmed} onChange={e => setTextConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span>Saya memastikan laporan berupa PDF / DOCX dengan teks yang bisa dipilih (bukan hanya hasil pindai).</span>
            </label>
            <div className="mt-4">
              {loading ? <Callout tone="info">Memuat referensi…</Callout> : !readyReferences ? <Callout tone="warning">Simpan SOP dan Template aktif untuk kategori ini sebelum pemeriksaan.</Callout> : <Callout tone="success">Referensi siap. Unggah laporan dan jalankan pemeriksaan.</Callout>}
            </div>
            <Button className="mt-4 w-full" icon="spark" disabled={!readyReferences || !readyReport || !textConfirmed || loading || isRunning} onClick={start}>Mulai Tinjauan AI</Button>
            <p className="mt-2 text-center text-xs text-ink-3">Backend membaca SOP dan template aktif dari PostgreSQL. Tidak perlu upload ulang setiap kali.</p>
          </GlassPanel>
        </aside>
      </div>
    </div>
  )
}
