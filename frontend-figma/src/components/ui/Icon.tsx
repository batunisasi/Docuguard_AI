const paths: Record<string, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.5 3.5-6 8-6s8 2.5 8 6',
  history: 'M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v4h4M12 8v4l3 2',
  compare: 'M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  clock: 'M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v4l3 2',
  bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14m-5-5l5 5-5 5',
  up: 'M12 19V5m-6 6l6-6 6 6',
  check: 'M5 12l5 5 9-10',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  info: 'M12 4a8 8 0 100 16 8 8 0 000-16zM12 11v5M12 8h.01',
  panel: 'M4 5h16v14H4zM9 5v14',
  chevron: 'M15 6l-6 6 6 6',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  refresh: 'M20 12a8 8 0 11-2.5-5.8M20 4v5h-5',
  play: 'M8 5l11 7-11 7z',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4',
  pdf: 'M6 3h8l4 4v14H6zM14 3v4h4',
}

export type IconName = keyof typeof paths

export function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name] ?? paths.info} />
    </svg>
  )
}
