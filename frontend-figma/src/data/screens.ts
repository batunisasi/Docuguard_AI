/** Single source for the eight screens: order, numbering, labels and icons. */
export const SCREENS = [
  { n: 1, id: 'dashboard', label: 'Dasbor', short: 'Dasbor', icon: 'grid' },
  { n: 2, id: 'new', label: 'Tinjauan Baru', short: 'Tinjauan Baru', icon: 'upload' },
  { n: 3, id: 'processing', label: 'Pemrosesan AI', short: 'Pemrosesan AI', icon: 'spark' },
  { n: 4, id: 'result', label: 'Hasil Tinjauan', short: 'Hasil Tinjauan', icon: 'shield' },
  { n: 5, id: 'findings', label: 'Temuan & Jejak Bukti', short: 'Jejak Bukti', icon: 'search' },
  { n: 6, id: 'human', label: 'Tinjauan Manusia', short: 'Tinjauan Manusia', icon: 'user' },
  { n: 7, id: 'history', label: 'Riwayat Tinjauan', short: 'Riwayat', icon: 'history' },
  { n: 8, id: 'compare', label: 'Perbandingan Versi', short: 'Perbandingan', icon: 'compare' },
] as const

export type ScreenId = (typeof SCREENS)[number]['id']
export const isScreen = (id: string): id is ScreenId => SCREENS.some((s) => s.id === id)

/** Eyebrow konsisten, mis. "Langkah 5 · Temuan dan jejak bukti". */
export function stepEyebrow(id: ScreenId, text: string) {
  return `Langkah ${SCREENS.find((s) => s.id === id)!.n} · ${text}`
}
