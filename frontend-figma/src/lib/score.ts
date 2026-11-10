import type { FindingStatus } from '../data/status'

/**
 * Persentase kesesuaian = item "Terpenuhi" ÷ item yang berlaku (tidak termasuk "Tidak Berlaku").
 * SOP dan templat selalu dihitung terpisah dan tidak pernah digabung.
 * "Terpenuhi Sebagian" belum dihitung sebagai terpenuhi.
 */
export function scoreOf(items: { status: FindingStatus }[]) {
  const applicable = items.filter((i) => i.status !== 'na')
  const met = applicable.filter((i) => i.status === 'fulfilled').length
  return { met, total: applicable.length, pct: applicable.length ? Math.round((met / applicable.length) * 100) : 0 }
}

export const SCORE_NOTE = 'Persentase = item Terpenuhi ÷ item yang berlaku (tidak termasuk Tidak Berlaku). Terpenuhi Sebagian belum dihitung.'
