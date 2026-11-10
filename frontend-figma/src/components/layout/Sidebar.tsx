import { nav, user } from '../../data/dashboard'
import { Icon } from '../ui/Icon'
import { useDemo } from '../../state/DemoStore'
import { LogoMark, Wordmark } from '../ui/Logo'

type Props = { active: string; onSelect: (id: string) => void; onClose?: () => void; collapsed?: boolean; onToggle?: () => void }

/** Sidebar utama. `collapsed` menampilkan rail ikon (hanya desktop); drawer mobile selalu penuh. */
export function Sidebar({ active, onSelect, onClose, collapsed = false, onToggle }: Props) {
  const c = collapsed
  const { demoMode, loadDemoReview, exitDemo } = useDemo()
  return (
    <aside aria-label="Navigasi utama" className={`flex h-full flex-col gap-5 overflow-hidden rounded-[1.75rem] border border-white/20 py-4 text-white shadow-[0_30px_60px_-25px_rgb(16_43_35/0.75),inset_0_1px_0_rgb(255_255_255/0.28),inset_0_0_0_1px_rgb(198_220_203/0.08)] backdrop-blur-2xl transition-[padding] duration-300 ${c ? 'px-2.5' : 'px-4'}`}
      style={{ background: 'var(--sidebar-bg)' }}>
      <div className={`flex items-center pt-1 ${c ? 'flex-col gap-3' : 'justify-between px-2'}`}>
        <div className="flex items-center gap-3"><LogoMark />{!c && <Wordmark light />}</div>
        {onToggle && (
          <button onClick={onToggle} aria-label={c ? 'Perluas sidebar' : 'Ciutkan sidebar'} aria-expanded={!c} title={c ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white">
            <Icon name="chevron" size={18} className={`transition-transform duration-300 ${c ? 'rotate-180' : ''}`} />
          </button>
        )}
        {onClose && <button onClick={onClose} aria-label="Tutup menu" className="grid size-10 place-items-center rounded-xl hover:bg-white/10 lg:hidden"><Icon name="close" /></button>}
      </div>

      <nav aria-label="Utama" className="flex-1 overflow-y-auto overflow-x-hidden">
        {!c && <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase">Ruang kerja</p>}
        <ul className="space-y-1">
          {nav.map((item) => {
            const on = item.id === active
            return (
              <li key={item.id}>
                <button onClick={() => { onSelect(item.id); onClose?.() }} aria-current={on ? 'page' : undefined} aria-label={item.label} title={c ? item.label : undefined}
                  className={`group flex min-h-11 w-full items-center rounded-control text-left text-sm font-medium whitespace-nowrap transition duration-200 ${c ? 'justify-center px-0' : 'gap-3 px-3'} ${
                    on ? 'border border-white/25 bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]'
                       : 'border border-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}>
                  <Icon name={item.icon} size={19} className={`shrink-0 ${on ? 'text-[#C6DCCB]' : ''}`} />
                  {!c && <span className="flex-1">{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {!c && (
        <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-white">
          <p className="mb-1 text-sm font-semibold">Informasi</p>
          <p className="text-xs leading-relaxed text-white/75">Website ini merupakan website propotipe sehingga belum ada page login</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => { if (demoMode) exitDemo(); else loadDemoReview(); onClose?.() }}
        title={c ? (demoMode ? 'Keluar mode demo' : 'Coba mode demo') : undefined}
        className={`flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20 ${c ? 'gap-0' : 'gap-2'}`}
      >
        <Icon name={demoMode ? 'close' : 'spark'} size={18} />
        {!c && <span>{demoMode ? 'Keluar Demo' : 'Coba Demo'}</span>}
      </button>

      <div className={`flex items-center rounded-2xl border border-white/15 bg-white/8 ${c ? 'justify-center p-1.5' : 'gap-3 p-2.5'}`} title={c ? `${user.name} · ${user.role}` : undefined}>
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-sage text-sm font-semibold">{user.initials}</div>
        {!c && <div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-white/55">{user.role}</p></div>}
      </div>
    </aside>
  )
}
