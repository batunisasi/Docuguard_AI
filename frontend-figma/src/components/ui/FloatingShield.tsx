/** Decorative 3D glass shield — the single hero "object" of the dashboard. */
export function FloatingShield() {
  return (
    <div className="relative size-56 select-none" aria-hidden="true">
      <div className="absolute inset-6 rounded-full bg-brand/25 blur-3xl" />
      <svg viewBox="0 0 200 220" className="float absolute inset-0 drop-shadow-[0_30px_30px_rgba(22,63,50,0.35)]">
        <defs>
          <linearGradient id="sh1" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#C6DCCB" /><stop offset=".5" stopColor="#2F7A60" /><stop offset="1" stopColor="#163F32" />
          </linearGradient>
          <linearGradient id="sh2" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#fff" stopOpacity=".75" /><stop offset=".55" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sh3" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#E4EFE7" stopOpacity=".15" />
          </linearGradient>
        </defs>
        <path d="M100 10l76 30v62c0 55-34 90-76 108-42-18-76-53-76-108V40z" fill="url(#sh1)" />
        <path d="M100 10l76 30v62c0 55-34 90-76 108z" fill="#102B23" opacity=".18" />
        <path d="M100 10l76 30v62c0 55-34 90-76 108-42-18-76-53-76-108V40z" fill="url(#sh2)" />
        <path d="M100 30l58 23v49c0 42-26 70-58 85-32-15-58-43-58-85V53z" fill="url(#sh3)" stroke="#fff" strokeOpacity=".7" strokeWidth="1.500" />
        <path d="M72 108l20 21 38-42" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="float absolute -left-4 top-24 grid h-14 w-11 place-items-center rounded-xl border border-white/80 bg-white/55 shadow-float backdrop-blur-md" style={{ ['--r' as string]: '-10deg', animationDelay: '-2s' }}>
        <div className="space-y-1.5"><i className="block h-1 w-6 rounded bg-brand/60" /><i className="block h-1 w-6 rounded bg-brand/35" /><i className="block h-1 w-4 rounded bg-brand/35" /></div>
      </div>
      <div className="float absolute -right-3 top-8 size-9 rounded-full border border-white/80 bg-gradient-to-br from-white/80 to-brand-2/40 shadow-float backdrop-blur-md" style={{ animationDelay: '-4s' }} />
    </div>
  )
}
