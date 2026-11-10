import { useEffect, useState, type ReactNode } from 'react'
import { nav } from '../../data/dashboard'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const KEY = 'docuguard-sidebar-collapsed'

export function AppShell({ active, onSelect, children }: { active: string; onSelect: (id: string) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  useEffect(() => { try { localStorage.setItem(KEY, collapsed ? '1' : '0') } catch { /* abaikan */ } }, [collapsed])
  const title = nav.find((n) => n.id === active)?.label ?? ''

  // Pintasan keyboard: tekan "[" untuk mengciutkan / memperluas sidebar
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '[' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) setCollapsed((c) => !c)
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])

  return (
    <>
      <div className="app-backdrop" aria-hidden="true"><i /></div>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Lompat ke konten</a>
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 p-3 sm:p-5">
        <div className={`sticky top-5 hidden h-[calc(100vh-2.5rem)] shrink-0 transition-[width] duration-300 ease-out lg:block ${collapsed ? 'w-[4.75rem]' : 'w-64 xl:w-72'}`}>
          <Sidebar active={active} onSelect={onSelect} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-3 left-3 w-72 max-w-[85vw]"><Sidebar active={active} onSelect={onSelect} onClose={() => setOpen(false)} /></div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Topbar title={title} onMenu={() => setOpen(true)} onNew={() => onSelect('new')} collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
          <main id="main" className="flex-1">{children}</main>
        </div>
      </div>
    </>
  )
}
