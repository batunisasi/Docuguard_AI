import type { VersionId } from '../../data/review'
import { useDemo } from '../../state/DemoStore'
import { Button } from './Button'

/** Switch between available versions of INC-2026-014 and jump back to the latest. */
export function VersionSwitcher() {
  const { reviews, viewVersion, latestVersion, selectVersion } = useDemo()
  const versions = (['V1', 'V2'] as VersionId[]).filter((v) => reviews[v])
  if (versions.length < 2) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full bg-navy/6 p-1" role="group" aria-label="Versi tinjauan">
        {versions.map((v) => (
          <button key={v} aria-pressed={viewVersion === v} onClick={() => selectVersion(v)}
            className={`min-h-9 rounded-full px-4 text-sm font-semibold transition ${viewVersion === v ? 'bg-brand text-white shadow-sm' : 'text-ink-2 hover:bg-white/70'}`}>
            {v}{v === latestVersion ? ' · terbaru' : ''}
          </button>
        ))}
      </div>
      {viewVersion !== latestVersion && latestVersion && <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => selectVersion(latestVersion)}>Kembali ke terbaru ({latestVersion})</Button>}
    </div>
  )
}
