import { useEffect } from 'react'
import { useDemo } from '../../state/DemoStore'
import { Icon } from './Icon'

const tone = {
  success: 'text-ok', info: 'text-brand', warning: 'text-partial', error: 'text-missing',
}
const icon = { success: 'check', info: 'info', warning: 'alert', error: 'alert' }

/** Global feedback for completed actions. */
export function ToastHost() {
  const { toast, dismissToast } = useDemo()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismissToast, 5000)
    return () => clearTimeout(t)
  }, [toast, dismissToast])
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div className="surface pointer-events-auto flex max-w-md items-start gap-3 !rounded-2xl px-4 py-3 shadow-float">
        <Icon name={icon[toast.tone]} size={18} className={`mt-0.5 shrink-0 ${tone[toast.tone]}`} />
        <p className="flex-1 text-sm font-medium">{toast.text}</p>
        <button onClick={dismissToast} aria-label="Tutup pesan" className="grid size-6 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-navy/8"><Icon name="close" size={14} /></button>
      </div>
    </div>
  )
}
