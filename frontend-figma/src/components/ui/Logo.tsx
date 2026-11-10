export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#729B83" /><stop offset="1" stopColor="#1C5945" /></linearGradient>
      </defs>
      <path d="M24 3l17 6.5V22c0 11-7 19.5-17 23C14 41.500 7 33 7 22V9.500z" fill="url(#lm)" />
      <path d="M24 3l17 6.5V22c0 11-7 19.500-17 23z" fill="#fff" opacity=".14" />
      <path d="M16 24.500l6 6 11-12" fill="none" stroke="#fff" strokeWidth="3.200" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="leading-none">
      <p className={`text-[15px] font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        DocuGuard <span className={light ? 'text-[#C6DCCB]' : 'text-brand'}>AI</span>
      </p>
      <p className={`mt-1 text-[10px] font-medium tracking-[0.14em] uppercase ${light ? 'text-white/55' : 'text-ink-3'}`}>
        Periksa. Verifikasi. Tingkatkan.
      </p>
    </div>
  )
}
