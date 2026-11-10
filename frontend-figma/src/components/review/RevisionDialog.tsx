import { useState } from 'react'
import { useDemo } from '../../state/DemoStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Callout } from '../ui/States'
import { validateFile } from '../../lib/validateFile'

/** Pemeriksaan ulang nyata: unggah file DOCX/PDF revisi, bukan menyunting teks demo. */
export function RevisionDialog() {
  const { revisionOpen, closeRevision, startRecheck, reviews } = useDemo()
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!revisionOpen) return null

  const currentFile = reviews.V1?.docs?.find(d => d.role === 'Laporan')?.name
    ?? reviews.V1?.docs?.[2]?.name
  const v2Exists = Boolean(reviews.V2)

  const submit = () => {
    if (v2Exists) return setError('Laporan ini sudah memiliki V2.')
    if (!file) return setError('Pilih file laporan revisi dalam format PDF atau DOCX.')
    const checked = validateFile(file.name, file.size)
    if (!checked.ok) return setError(checked.message)
    if (!confirmed) return setError('Konfirmasi bahwa laporan revisi berisi teks yang dapat dipilih.')
    setError(null)
    startRecheck(file)
  }

  return (
    <Modal title="Pemeriksaan ulang laporan V2" onClose={closeRevision} wide>
      <p className="eyebrow mb-1">Pemeriksaan ulang dengan n8n + Gemini</p>
      <h2 className="text-xl font-semibold tracking-tight">Unggah laporan yang sudah direvisi</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-3">
        Perbaiki laporan di Word atau PDF terlebih dahulu, simpan sebagai file baru, lalu unggah di sini.
        Sistem akan memeriksa kembali seluruh kriteria SOP dan templat. Hasil V1 tetap disimpan.
      </p>

      <div className="mt-4 rounded-xl border border-navy/8 bg-canvas/70 p-3 text-sm">
        <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Dokumen awal (V1)</p>
        <p className="mt-1 break-all font-medium text-ink-2">{currentFile || 'Laporan V1'}</p>
      </div>

      <div className="mt-4">
        <label htmlFor="revision-report" className="mb-1.5 block text-sm font-semibold">
          File laporan revisi (V2)
        </label>
        <input
          id="revision-report"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null) }}
          className="w-full rounded-xl border border-navy/15 bg-paper p-3 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
          disabled={v2Exists}
        />
        {file && <p className="mt-2 break-all text-xs text-ink-3">Dipilih: {file.name}</p>}
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-navy/10 bg-paper/70 p-3 text-sm">
        <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={v2Exists} />
        <span>File revisi berisi teks yang dapat dipilih, bukan dokumen hasil pemindaian gambar.</span>
      </label>

      <div className="mt-4 space-y-2" aria-live="polite">
        {error && <Callout tone="error">{error}</Callout>}
        {v2Exists && <Callout tone="warning">V2 sudah tersedia. Buka Perbandingan Versi untuk membandingkan hasil V1 dengan V2.</Callout>}
        <Callout tone="info">
          Status tidak otomatis menjadi Terpenuhi hanya karena ada berkas revisi. Backend akan mengekstraksi
          dokumen baru, lalu n8n dan Gemini menilai ulang buktinya. V2 mendapat UUID baru di database
          dan terhubung ke V1 melalui parentReviewId.
        </Callout>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button icon="refresh" onClick={submit} disabled={v2Exists || !file || !confirmed}>Unggah & Periksa Ulang V2</Button>
        <Button variant="ghost" className="ml-auto" onClick={closeRevision}>Batal</Button>
      </div>
    </Modal>
  )
}
