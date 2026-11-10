export type ReportType = 'incident' | 'sales' | 'budget'
export type ReferenceRecord = {
  id: string; report_type: ReportType; document_kind: 'sop' | 'template';
  version_no: number; original_filename: string; is_active: boolean; uploaded_at: string
}

export async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, init)
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || result?.message || `Server error ${response.status}`)
  return result
}
export const fetchReferences = (reportType?: ReportType): Promise<{items: ReferenceRecord[]}> =>
  request('/api/references' + (reportType ? `?reportType=${encodeURIComponent(reportType)}` : ''))

export async function uploadReference(file: File, kind: 'sop' | 'template', reportType: ReportType = 'incident') {
  const body = new FormData()
  body.append('file', file)
  body.append('reportType', reportType)
  body.append('documentKind', kind)
  return request('/api/references', { method: 'POST', body })
}
export async function runReview(file: File, parentReviewId?: string, reportType: ReportType = 'incident') {
  const body = new FormData()
  body.append('file', file)
  body.append('reportType', reportType)
  if (parentReviewId) body.append('parentReviewId', parentReviewId)
  return request('/api/reviews', { method: 'POST', body })
}
export const fetchReviews = () => request('/api/reviews')
export const fetchReview = (id: string) => request(`/api/reviews/${encodeURIComponent(id)}`)
