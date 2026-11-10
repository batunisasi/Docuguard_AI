import { DemoProvider, useDemo } from './state/DemoStore'
import { AppShell } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { GlassPanel } from './components/ui/Glass'
import { EmptyState } from './components/ui/States'
import { ToastHost } from './components/ui/Toast'
import { RevisionDialog } from './components/review/RevisionDialog'
import { ResetDialog } from './components/review/ResetDialog'
import { UnsavedDialog } from './components/review/UnsavedDialog'
import { AIProcessing } from './screens/AIProcessing'
import { Dashboard } from './screens/Dashboard'
import { FindingsEvidence } from './screens/FindingsEvidence'
import { HumanReview } from './screens/HumanReview'
import { NewReview } from './screens/NewReview'
import { ReviewHistory } from './screens/ReviewHistory'
import { ReviewResult } from './screens/ReviewResult'
import { VersionComparison } from './screens/VersionComparison'

function Screens() {
  const { active, navigate, demoMode, exitDemo } = useDemo()
  // Only mount the active screen. Rendering all screens in a map eagerly
  // can crash the entire app when an inactive screen lacks compatible data.
  const screens: Record<string, () => React.ReactNode> = {
    dashboard: () => <Dashboard onNavigate={navigate} />,
    new: () => <NewReview onNavigate={navigate} />,
    processing: () => <AIProcessing />,
    result: () => <ReviewResult onNavigate={navigate} />,
    findings: () => <FindingsEvidence onNavigate={navigate} />,
    human: () => <HumanReview onNavigate={navigate} />,
    history: () => <ReviewHistory />,
    compare: () => <VersionComparison />,
  }
  return (
    <AppShell active={active} onSelect={navigate}>
      {demoMode && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-partial/30 bg-partial-soft px-4 py-3 text-sm text-partial">
          <span><strong>MODE DEMO.</strong> Kasus DEMO menggunakan dokumen, temuan, persentase, dan bukti fiktif. Tidak menghubungi n8n/Gemini atau database. Kasus asli tetap tersimpan terpisah.</span>
          <Button type="button" variant="glass" className="!min-h-9" onClick={exitDemo}>Keluar Demo</Button>
        </div>
      )}
      {screens[active]?.() ?? (
        <GlassPanel variant="glass-strong" className="mx-auto mt-10 max-w-lg">
          <EmptyState icon="info" title="Screen not found" body="This screen does not exist."
            action={<Button variant="glass" onClick={() => navigate('dashboard')}>Back to Dashboard</Button>} />
        </GlassPanel>
      )}
      <RevisionDialog />
      <UnsavedDialog />
      <ResetDialog />
      <ToastHost />
    </AppShell>
  )
}

export default function App() {
  return <DemoProvider><Screens /></DemoProvider>
}
