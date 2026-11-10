import { useDemo } from '../../state/DemoStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function ResetDialog() {
  const { resetOpen, cancelReset, confirmReset, cases } = useDemo()
  if (!resetOpen) return null
  return (
    <Modal title="Reset demo" onClose={cancelReset}>
      <h2 className="text-xl font-semibold tracking-tight">Reset demo?</h2>
      <p className="mt-1.5 text-sm text-ink-2">Ini mengembalikan demo ke kondisi awal dan menghapus secara permanen:</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
        <li>Catatan tinjauan saat ini{cases.length ? ` (${cases.length} dibuat dalam demo ini)` : ''}</li>
        <li>Riwayat versi, termasuk V1 dan V2</li>
        <li>Data tinjauan manusia yang tercatat</li>
        <li>Catatan peninjau</li>
        <li>File demo yang diunggah</li>
      </ul>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={confirmReset} className="!from-missing !to-missing">Reset demo</Button>
        <Button variant="glass" onClick={cancelReset}>Batal</Button>
      </div>
    </Modal>
  )
}
