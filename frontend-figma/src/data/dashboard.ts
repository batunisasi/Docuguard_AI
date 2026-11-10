
export const user = { name: 'Ummu Diana', firstName: 'Diana', role: 'Peninjau Layanan TI', initials: 'UD' }

import { SCREENS } from './screens'

export const journey = SCREENS.map((s) => ({ n: s.n, label: s.short, phase: 'live' as const }))

export const nav = SCREENS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, live: true as const }))
