export function compactText(value: string, head = 8, tail = 4) {
  const text = String(value ?? '')
  if (!text) return ''
  if (text.length <= head + tail + 1) return text
  return `${text.slice(0, head)}…${text.slice(-tail)}`
}

export function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? '').trim())
}

export function compactReviewId(id: string) {
  return looksLikeUuid(id) ? compactText(id, 8, 4) : id
}
