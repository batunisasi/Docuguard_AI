import type { ReviewData } from '../data/review'

/** CLEAR berarti seluruh kriteria SOP dan template yang DIEVALUASI terpenuhi.
 * Tidak sama dengan persetujuan final manusia.
 * Ketentuan yang tidak berlaku diabaikan, tetapi minimal satu kriteria
 * yang berlaku wajib tersedia di kedua penilaian.
 */
export function isClearReview(review: ReviewData): boolean {
  const sop = review.sopAssessment ?? []
  const template = review.templateAssessment ?? []
  const findings = review.findings ?? []
  const applicable = <T extends { status: string }>(rows: T[]) => rows.filter(r => r.status !== 'na')
  const sopChecked = applicable(sop)
  const templateChecked = applicable(template)
  return sopChecked.length > 0 && templateChecked.length > 0
    && findings.length > 0
    && sopChecked.every(r => r.status === 'fulfilled')
    && templateChecked.every(r => r.status === 'fulfilled')
    && findings.every(r => r.status === 'fulfilled' || r.status === 'na')
}
