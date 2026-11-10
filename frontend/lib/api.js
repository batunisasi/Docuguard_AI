const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || 'Permintaan gagal.');
  return data;
}
