import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Accessible dialog: focus moves in, Tab/Shift+Tab are trapped, Escape closes, focus returns to the opener. */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const labelId = useId()

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const focusables = () => [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((e) => e.offsetParent !== null)
    ;(box.current?.querySelector<HTMLElement>('textarea, input') ?? focusables()[0] ?? box.current)?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (f.length === 0) { e.preventDefault(); return }
      const first = f[0], last = f[f.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!box.current?.contains(active)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('keydown', key, true); if (opener && document.contains(opener)) opener.focus() }
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-navy/45 backdrop-blur-sm" onClick={() => close.current()} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1}
        className={`glass-strong relative w-full p-5 sm:p-7 outline-none ${wide ? 'max-w-2xl' : 'max-w-md'}`} style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(24px)' }}>
        <span id={labelId} className="sr-only">{title}</span>
        {children}
      </div>
    </div>
  )
}
