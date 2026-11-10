import { useDemo } from '../../state/DemoStore'
import { Button } from '../ui/Button'
import { GlassPanel } from '../ui/Glass'
import { EmptyState } from '../ui/States'

/** Shown by any screen that needs a generated review when none exists yet. */
export function NoReviewState({ screen }: { screen: string }) {
  const { navigate, loadDemoReview } = useDemo()
  return (
    <div className="mx-auto max-w-xl pt-6">
      <GlassPanel variant="glass-strong">
        <EmptyState icon="file" title={`${screen} memerlukan hasil tinjauan`}
          body="Belum ada tinjauan yang dibuat. Unggah ketiga dokumen lalu jalankan tinjauan AI simulasi, atau muat tinjauan demo untuk langsung menjelajah."
          action={<div className="mt-2 flex flex-wrap justify-center gap-2"><Button icon="upload" onClick={() => navigate('new')}>Unggah dokumen</Button><Button variant="glass" onClick={loadDemoReview}>Muat tinjauan demo (V1)</Button></div>} />
      </GlassPanel>
    </div>
  )
}
