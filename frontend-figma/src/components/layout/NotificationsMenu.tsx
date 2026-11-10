import { useMemo, useState } from 'react'
import { useDemo } from '../../state/DemoStore'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { usePopover } from './usePopover'

type Note = { id: string; icon: string; title: string; body: string; run: () => void }

/** Notifications are derived from real demo state, so they stay consistent with every screen. */
export function NotificationsMenu() {
  const demo = useDemo()
  const [open, setOpen] = useState(false)
  const root = usePopover(open, () => setOpen(false))

  const notes = useMemo<Note[]>(() => {
    const out: Note[] = []
    for (const c of [...demo.cases].reverse()) {
      const v = c.reviews.V2 ? 'V2' : 'V1'
      const r = c.reviews[v]!
      if (c.reviews.V2) out.push({ id: `v2-${c.id}`, icon: 'compare', title: `${c.id} V2 dibuat`, body: 'V1 tetap tersimpan. Bandingkan kedua versi.', run: () => demo.openCompare(c.id) })
      for (const f of r.findings.filter((x) => x.status === 'needs_review'))
        if ((c.hr[v]?.status ?? 'pending') !== 'reviewed')
          out.push({ id: `hr-${c.id}-${v}-${f.id}`, icon: 'user', title: 'Temuan memerlukan tinjauan manusia', body: `${f.title} · ${c.id} ${v}`, run: () => demo.openHuman(c.id, v) })
      const open = r.findings.filter((x) => x.status === 'partial' || x.status === 'not_found')
      if (open.length) out.push({ id: `att-${c.id}-${v}-${open.length}`, icon: 'flag', title: `${open.length} temuan perlu perhatian`, body: `${open.map((f) => f.title).join(', ')} · ${c.id} ${v}`, run: () => demo.openFinding(c.id, v, open[0].id) })
      if (c.hr[v]?.status === 'reviewed') out.push({ id: `done-${c.id}-${v}`, icon: 'check', title: `Tinjauan manusia dicatat untuk ${v}`, body: `${c.id} · penilaian AI tidak berubah`, run: () => demo.openHuman(c.id, v) })
    }
    return out
  }, [demo.cases, demo.history]) // eslint-disable-line react-hooks/exhaustive-deps

  const unseen = notes.filter((n) => !demo.notifSeen.includes(n.id))
  const choose = (n: Note) => { demo.markNotifsSeen([n.id]); setOpen(false); n.run() }

  return (
    <div ref={root} className="relative shrink-0">
      <button data-trigger type="button" aria-haspopup="true" aria-expanded={open} aria-controls="notif-panel" onClick={() => setOpen((o) => !o)}
        aria-label={unseen.length ? `Notifikasi, ${unseen.length} belum dibaca` : 'Notifikasi, semua sudah dibaca'}
        className="glass relative grid size-11 place-items-center !rounded-control">
        <Icon name="bell" />
        {unseen.length > 0 && <span className="absolute top-2 right-2 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-white">{unseen.length}</span>}
      </button>
      {open && (
        <div id="notif-panel" role="region" aria-label="Notifikasi" className="surface fixed inset-x-3 top-20 z-30 max-h-[70vh] overflow-y-auto !rounded-2xl p-3 shadow-float sm:absolute sm:inset-x-auto sm:top-[calc(100%+8px)] sm:right-0 sm:w-[24rem]">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Notifikasi</h2>
            {unseen.length > 0 && <Button variant="ghost" className="!min-h-8 !px-2 text-xs" onClick={() => demo.markNotifsSeen(notes.map((n) => n.id))}>Tandai semua sudah dibaca</Button>}
          </div>
          {notes.length === 0 ? (
            <div className="grid place-items-center gap-1 px-4 py-8 text-center">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon name="check" /></span>
              <p className="font-semibold">Semua sudah terbaca</p>
              <p className="text-sm text-ink-3">Peringatan tentang temuan dan versi baru akan muncul di sini setelah ada tinjauan.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {notes.map((n) => {
                const isNew = !demo.notifSeen.includes(n.id)
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => choose(n)} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-soft/70">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon name={n.icon} size={16} /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{n.title}</span><span className="block text-xs text-ink-3">{n.body}</span></span>
                      {isNew && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Belum dibaca" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
