import { useDemo } from '../../state/DemoStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** Shared unsaved-changes dialog: version switch, navigation, new review and reset all use it. */
export function UnsavedDialog() {
  const { unsaved, resolveUnsaved } = useDemo()
  if (!unsaved) return null
  return (
    <Modal title="Catatan peninjau belum disimpan" onClose={() => resolveUnsaved('cancel')}>
      <h2 className="text-xl font-semibold tracking-tight">Ada catatan peninjau yang belum disimpan</h2>
      <p className="mt-1.5 text-sm text-ink-2">Catatan atau keputusan Anda belum disimpan. Pilih tindakan sebelum melanjutkan.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => resolveUnsaved('save')}>Simpan Perubahan &amp; Lanjutkan</Button>
        <Button variant="glass" onClick={() => resolveUnsaved('discard')}>Buang Perubahan &amp; Lanjutkan</Button>
        <Button variant="ghost" onClick={() => resolveUnsaved('cancel')}>Batal</Button>
      </div>
    </Modal>
  )
}
