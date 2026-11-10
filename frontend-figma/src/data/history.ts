import type { ReviewState } from './status'

export type ReviewTarget = { id: string; version: 'V1' | 'V2' | string }

export type HistoryRecord = {
  key: string
  id: string
  title: string
  report: string
  version: string
  date: string
  status: ReviewState
  latest: boolean
  /** Persentase kesesuaian (hanya untuk tinjauan yang dibuat dalam demo). */
  sop?: number
  tpl?: number
}

/** Riwayat contoh statis (data dummy). INC-2026-014 versions are added from shared state. Tinjauan yang dibuat dalam demo ini (dimulai dari INC-2026-014) ditambahkan dari state bersama dan hanya itu yang memiliki temuan rinci. */
export const sampleRecords: HistoryRecord[] = [
  { key: '013-v2', id: 'INC-2026-013', title: 'Sertifikat gateway VPN kedaluwarsa', report: 'INC-2026-013_Sertifikat-VPN_rev2.docx', version: 'V2', date: '8 Jun 2026, 16:05', status: 'human_reviewed', latest: true },
  { key: '013-v1', id: 'INC-2026-013', title: 'Sertifikat gateway VPN kedaluwarsa', report: 'INC-2026-013_Sertifikat-VPN.docx', version: 'V1', date: '8 Jun 2026, 14:20', status: 'human_reviewed', latest: false },
  { key: '012-v1', id: 'INC-2026-012', title: 'Kegagalan job batch penggajian', report: 'INC-2026-012_Batch-Penggajian.pdf', version: 'V1', date: '8 Jun 2026, 10:32', status: 'awaiting_human', latest: true },
  { key: '011-v3', id: 'INC-2026-011', title: 'Antrean relay email menumpuk', report: 'INC-2026-011_Relay-Email_rev3.docx', version: 'V3', date: '7 Jun 2026, 15:48', status: 'human_reviewed', latest: true },
  { key: '011-v2', id: 'INC-2026-011', title: 'Antrean relay email menumpuk', report: 'INC-2026-011_Relay-Email_rev2.docx', version: 'V2', date: '7 Jun 2026, 11:10', status: 'human_reviewed', latest: false },
  { key: '011-v1', id: 'INC-2026-011', title: 'Antrean relay email menumpuk', report: 'INC-2026-011_Relay-Email.docx', version: 'V1', date: '6 Jun 2026, 17:25', status: 'human_reviewed', latest: false },
  { key: '010-v1', id: 'INC-2026-010', title: 'Keterlambatan ETL data warehouse', report: 'INC-2026-010_Keterlambatan-ETL_pindaian.pdf', version: 'V1', date: '6 Jun 2026, 09:03', status: 'rejected_file', latest: true },
]
