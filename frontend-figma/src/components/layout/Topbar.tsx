import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LogoMark } from '../ui/Logo'
import { NotificationsMenu } from './NotificationsMenu'
import { TopbarSearch } from './TopbarSearch'

type Props = { title: string; onMenu: () => void; onNew: () => void; collapsed: boolean; onToggleSidebar: () => void }

export function Topbar({ title, onMenu, onNew, collapsed, onToggleSidebar }: Props) {
  return (
    <header className="flex items-center gap-3">
      <button onClick={onMenu} aria-label="Buka menu" className="glass grid size-11 shrink-0 place-items-center !rounded-control lg:hidden"><Icon name="menu" /></button>
      {/* Tombol ciutkan/perluas sidebar untuk layar laptop dan desktop */}
      <button onClick={onToggleSidebar} aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'} aria-pressed={collapsed} title="Ciutkan / perluas sidebar ([)"
        className="glass hidden size-11 shrink-0 place-items-center !rounded-control lg:grid"><Icon name="panel" /></button>
      <div className="flex items-center gap-2 lg:hidden"><LogoMark size={28} /></div>
      <p className="hidden text-sm font-medium text-ink-3 xl:block">Ruang kerja <span className="mx-1">/</span> <span className="text-ink">{title}</span></p>
      <TopbarSearch />
      <NotificationsMenu />
      <Button icon="plus" onClick={onNew} className="hidden sm:inline-flex">Tinjauan Baru</Button>
    </header>
  )
}
