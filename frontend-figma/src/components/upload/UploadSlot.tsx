import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import type { slotMeta } from '../../data/review'
import type { Slot } from '../../state/ReviewFlow'
import { extOf, formatSize } from '../../lib/validateFile'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Callout } from '../ui/States'

type Props = {
  meta: (typeof slotMeta)[number]
  slot: Slot
  onFile: (file: File) => void
  onRemove: () => void
}

export function UploadSlot({ meta, slot, onFile, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const hintId = useId()
  const browse = () => input.current?.click()

  const take = (f?: File) => { if (f) onFile(f) }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]) }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); browse() } }

  const ready = slot.status === 'ready'
  const invalid = slot.status === 'invalid'

  return (
    <section
      aria-labelledby={`${hintId}-t`}
      className={`glass-strong p-4 sm:p-5 transition-shadow ${ready ? 'ring-1 ring-brand/30' : ''} ${invalid ? 'ring-1 ring-missing/40' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-4">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${ready ? 'bg-brand text-white' : 'bg-brand-soft text-brand'}`}>
          {ready ? <Icon name="check" size={18} /> : meta.n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id={`${hintId}-t`} className="text-base font-semibold tracking-tight">{meta.title}</h2>
            <span className="rounded-full bg-navy/6 px-2 py-0.5 text-[11px] font-semibold text-ink-3">Wajib</span>
          </div>
          <p id={hintId} className="mt-0.5 text-sm text-ink-3">{meta.hint}</p>

          <div className="mt-4" aria-live="polite">
            {(slot.status === 'empty') && (
              <div role="button" tabIndex={0} onClick={browse} onKeyDown={onKey} aria-describedby={hintId}
                aria-label={`Unggah ${meta.title}. Seret file ke sini atau tekan Enter untuk memilih.`}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                  drag ? 'scale-[1.01] border-brand bg-brand-soft' : 'border-sage/50 bg-paper/60 hover:border-brand/60 hover:bg-paper'}`}>
                <Icon name="upload" size={22} className="text-brand" />
                <p className="text-sm font-semibold">{drag ? 'Lepas untuk mengunggah' : 'Seret dan lepas file Anda di sini'}</p>
                <p className="text-xs text-ink-3">atau <span className="font-semibold text-brand underline underline-offset-2">pilih file</span> · PDF atau DOCX</p>
              </div>
            )}

            {slot.file && slot.status !== 'empty' && (
              <div className={`surface !rounded-2xl p-3.5 ${invalid ? '!border-missing/30' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${invalid ? 'bg-missing-soft text-missing' : 'bg-brand-soft text-brand'}`}>
                    <Icon name={invalid ? 'alert' : extOf(slot.file.name) === 'pdf' ? 'pdf' : 'doc'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold [overflow-wrap:anywhere]">{slot.file.name}</p>
                    <p className="text-xs text-ink-3">{extOf(slot.file.name).toUpperCase()} · {formatSize(slot.file.size)}</p>
                  </div>
                  {ready && <span className="hidden rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok sm:inline">Siap</span>}
                  {invalid && <span className="hidden rounded-full bg-missing-soft px-2.5 py-1 text-xs font-semibold text-missing sm:inline">Tidak valid</span>}
                  <div className="flex shrink-0 gap-1">
                    {slot.status === 'uploading'
                      ? <Button variant="ghost" onClick={onRemove} className="!min-h-9 !px-3">Batal</Button>
                      : <>
                          <Button variant="ghost" icon="refresh" onClick={browse} aria-label={`Ganti ${meta.title}`} className="!min-h-9 !px-3"><span className="hidden sm:inline">{invalid ? 'Pilih file lain' : 'Ganti'}</span></Button>
                          <Button variant="ghost" icon="trash" onClick={onRemove} aria-label={`Hapus ${meta.title}`} className="!min-h-9 !px-3 hover:!text-missing"><span className="sr-only sm:not-sr-only">Hapus</span></Button>
                        </>}
                  </div>
                </div>

                {slot.status === 'uploading' && (
                  <div className="mt-3">
                    <div role="progressbar" aria-label={`Mengunggah ${slot.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(slot.progress)}
                      className="h-1.5 overflow-hidden rounded-full bg-navy/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-sage to-brand transition-[width] duration-150" style={{ width: `${slot.progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-3">Mengunggah… (progres simulasi)</p>
                  </div>
                )}
                {invalid && <div className="mt-3"><Callout tone="error">{slot.error}</Callout></div>}
              </div>
            )}
          </div>
        </div>
      </div>
      <input ref={input} type="file" hidden accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = '' }} />
    </section>
  )
}
