import { config } from './config'

export type Validation = { ok: true } | { ok: false; code: 'format' | 'empty' | 'size' | 'scanned' | 'duplicate'; message: string }

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/**
 * Prototype-only validation: extension, empty file and the optional configured size limit.
 * File contents are never opened, so scanned or image-only documents cannot be detected.
 * Instead the user confirms that the files contain selectable text (see NewReview).
 * `declaredScanned` is only used by the demo button that previews the unsupported state.
 */
export function validateFile(name: string, size: number, opts: { declaredScanned?: boolean } = {}): Validation {
  const ext = extOf(name)
  if (!(config.acceptedExtensions as readonly string[]).includes(ext))
    return { ok: false, code: 'format', message: `File ".${ext || 'tidak dikenal'}" tidak didukung. Unggah file PDF atau DOCX.` }
  if (size === 0) return { ok: false, code: 'empty', message: 'File ini kosong. Pilih dokumen yang berisi teks.' }
  if (config.maxFileBytes !== null && size > config.maxFileBytes)
    return { ok: false, code: 'size', message: `Ukuran file ini ${formatSize(size)}, melebihi batas yang dikonfigurasi sebesar ${formatSize(config.maxFileBytes)}.` }
  if (opts.declaredScanned)
    return { ok: false, code: 'scanned', message: 'File ini ditandai sebagai dokumen hasil pindai atau berbasis gambar. Dokumen pindaian tidak didukung di MVP ini karena belum ada OCR. Unggah PDF atau DOCX berbasis teks.' }
  return { ok: true }
}
