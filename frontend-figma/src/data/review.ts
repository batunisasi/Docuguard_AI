import type { FindingStatus, Severity } from './status'

export type SlotId = 'sop' | 'template' | 'report'

export const slotMeta: { id: SlotId; n: number; title: string; hint: string; sample: { name: string; size: number } }[] = [
  { id: 'sop', n: 1, title: 'Dokumen SOP', hint: 'Standard Operating Procedure yang harus dipatuhi laporan.', sample: { name: 'SOP-IT-INC-004_v3.2.pdf', size: 482_000 } },
  { id: 'template', n: 2, title: 'Templat Laporan Insiden', hint: 'Templat yang bagian-bagiannya harus dilengkapi laporan.', sample: { name: 'TPL-INC-T1_v2.0.docx', size: 96_400 } },
  { id: 'report', n: 3, title: 'Laporan Insiden', hint: 'Laporan yang akan ditinjau (Insiden TI T1).', sample: { name: 'INC-2026-014_Laporan-Insiden.docx', size: 214_800 } },
]

/** Tahap pemrosesan AI — seluruhnya simulasi pada prototipe ini. */
export const stages = [
  { id: 'validate', label: 'Validasi dokumen', active: 'Memeriksa format file dari ketiga dokumen', done: 'Ketiga file lolos validasi format. Isi dokumen diasumsikan berbasis teks; isi dokumen tidak diperiksa dalam demo ini.' },
  { id: 'extract', label: 'Ekstraksi teks', active: 'Mengekstrak teks dari ketiga dokumen', done: 'Ekstraksi teks disimulasikan untuk SOP, templat, dan laporan' },
  { id: 'sop', label: 'Identifikasi persyaratan SOP', active: 'Mencari persyaratan wajib dalam SOP', done: '6 persyaratan SOP teridentifikasi' },
  { id: 'template', label: 'Analisis kelengkapan templat', active: 'Memetakan isi laporan ke bagian-bagian templat', done: '8 bagian templat dipetakan (1 tidak berlaku)' },
  { id: 'evidence', label: 'Validasi bukti', active: 'Mencocokkan setiap temuan dengan kutipan teks laporan', done: 'Kutipan bukti dikaitkan dengan temuan' },
  { id: 'classify', label: 'Klasifikasi temuan', active: 'Menetapkan status kepatuhan dan tingkat keparahan', done: '6 temuan terklasifikasi' },
  { id: 'result', label: 'Pembuatan hasil tinjauan', active: 'Menyiapkan hasil tinjauan untuk peninjau manusia', done: 'Hasil tinjauan siap' },
] as const

export const REVIEW_ID = 'INC-2026-014'
export const REVIEW_TITLE = 'Latensi API core banking dan gangguan sebagian'
export const DOMAIN = 'Insiden TI T1'
export type VersionId = 'V1' | 'V2'

export type DocInfo = { role: string; name: string; meta: string }

export type Evidence = {
  id: string
  docRole: 'Laporan Insiden' | 'SOP' | 'Templat'
  docName: string
  excerpt: string
  /** Hanya diisi bila referensi bagian tersedia. Nomor halaman tidak pernah dikarang. */
  location: string | null
  addedInVersion?: VersionId
}

export type Finding = {
  id: string
  title: string
  summary: string
  status: FindingStatus
  /** Independent of status: there is no fixed mapping between the two. */
  severity: Severity
  sopRef: string
  templateSection: string
  requirement: { ref: string; text: string }
  evidence: Evidence[]
  explanation: string
  recommendation: string
}

export type ReviewData = {
  id: string; title: string; version: VersionId; domain: string; checkedAt: string
  /** UUID baris review nyata di backend (V2 berbeda dari UUID V1). */
  serverReviewId?: string
  /** Kategori untuk memilih pasangan SOP + templat di backend. */
  reportType?: 'incident' | 'sales' | 'budget'
  docs: DocInfo[]
  summary: string
  findings: Finding[]
  sopAssessment: { ref: string; label: string; status: FindingStatus }[]
  templateAssessment: { ref: string; label: string; status: FindingStatus }[]
  recommendations: { id: string; findingId: string; text: string; detail: string }[]
}

/** Revisi akar masalah dari peninjau (skenario V1 -> V2). */
export type Revision = { statement: string; evidence: string }

export const EMPTY_REVISION: Revision = { statement: '', evidence: '' }

export const SAMPLE_REVISION: Revision = {
  statement: 'Akar masalah terkonfirmasi: pengaturan idle-timeout load balancer lebih rendah daripada waktu respons API saat beban puncak, sehingga koneksi di-reset.',
  evidence: 'Catatan perubahan CHG-24-0611 menunjukkan idle timeout diturunkan saat pemeliharaan. Log load balancer menunjukkan koneksi di-reset mulai pukul 09:05 UTC.',
}

export const V1_ROOT_CAUSE_TEXT = 'Hipotesis: konfigurasi timeout load balancer kemungkinan menyebabkan permintaan gagal. Konfirmasi akhir masih menunggu.'

// ---- Temuan demonstrasi INC-2026-014 (fiktif; bukan hasil ekstraksi dari file yang diunggah) ----

function findingsFor(report: string): Finding[] {
  const rep = (id: string, excerpt: string, location: string | null): Evidence =>
    ({ id, docRole: 'Laporan Insiden', docName: report, excerpt, location })
  return [
    {
      id: 'F-01', title: 'Stempel waktu deteksi dan pemulihan', summary: 'Waktu deteksi dan waktu pemulihan keduanya tercatat.',
      status: 'fulfilled', severity: 'information', sopRef: 'SOP 4.2', templateSection: '2 · Linimasa insiden',
      requirement: { ref: 'SOP 4.2', text: 'Laporan harus menyebutkan kapan insiden terdeteksi dan kapan layanan dipulihkan.' },
      evidence: [rep('E-01a', 'Deteksi pada 09:12 UTC dan pemulihan layanan pada 10:03 UTC.', 'Bagian Linimasa Insiden')],
      explanation: 'Waktu deteksi dan waktu pemulihan sama-sama ada dan berlabel jelas, sesuai yang diminta SOP 4.2.',
      recommendation: 'Tidak perlu tindakan.',
    },
    {
      id: 'F-02', title: 'Ringkasan dampak bisnis', summary: 'Durasi gangguan layanan disebutkan.',
      status: 'fulfilled', severity: 'minor', sopRef: 'SOP 4.3', templateSection: '3 · Dampak bisnis',
      requirement: { ref: 'SOP 4.3', text: 'Laporan harus merangkum dampak bisnis, termasuk durasi gangguan.' },
      evidence: [rep('E-02a', 'Gangguan layanan berlangsung sekitar 51 menit.', 'Bagian Dampak Bisnis')],
      explanation: 'Laporan menyebutkan berapa lama gangguan berlangsung, sehingga persyaratan terpenuhi. Jumlah pelanggan terdampak tidak disebutkan, yang tidak diwajibkan secara ketat oleh SOP.',
      recommendation: 'Opsional: tambahkan jumlah pelanggan terdampak jika diketahui.',
    },
    {
      id: 'F-03', title: 'Akar masalah', summary: 'Penyebab masih berupa hipotesis dan belum dikonfirmasi final.',
      status: 'partial', severity: 'major', sopRef: 'SOP 5.1', templateSection: '4 · Analisis akar masalah',
      requirement: { ref: 'SOP 5.1', text: 'Akar masalah harus didokumentasikan dan didukung bukti seperti log atau catatan perubahan.' },
      evidence: [rep('E-03a', V1_ROOT_CAUSE_TEXT, 'Bagian Akar Masalah')],
      explanation: 'Akar masalah belum dikonfirmasi final. Laporan hanya menyampaikan hipotesis tentang konfigurasi timeout load balancer tanpa mengutip log atau catatan perubahan yang mendukungnya.',
      recommendation: 'Konfirmasi akar masalah dan kutip catatan perubahan atau cuplikan log yang mendukungnya.',
    },
    {
      id: 'F-04', title: 'Tindakan korektif', summary: 'Tindakan untuk memulihkan layanan telah dicantumkan.',
      status: 'fulfilled', severity: 'minor', sopRef: 'SOP 5.2', templateSection: '5 · Tindakan korektif',
      requirement: { ref: 'SOP 5.2', text: 'Laporan harus mencantumkan tindakan korektif yang dilakukan untuk memulihkan layanan.' },
      evidence: [rep('E-04a', 'Restart layanan dilakukan. Penyesuaian sementara konfigurasi timeout diterapkan.', 'Bagian Tindakan Korektif')],
      explanation: 'Restart layanan dan penyesuaian sementara timeout sama-sama tercantum, sehingga memenuhi SOP 5.2.',
      recommendation: 'Tidak perlu tindakan.',
    },
    {
      id: 'F-05', title: 'Tindakan pencegahan dan penanggung jawab', summary: 'Tidak ditemukan tindakan pencegahan maupun penanggung jawab.',
      status: 'not_found', severity: 'major', sopRef: 'SOP 5.3', templateSection: '6 · Tindakan pencegahan',
      requirement: { ref: 'SOP 5.3', text: 'Laporan harus mencatat setidaknya satu tindakan pencegahan dan menyebutkan penanggung jawabnya.' },
      evidence: [],
      explanation: 'Tidak ditemukan tindakan pencegahan atau penanggung jawab. Bagian Tindakan Pencegahan tidak berisi teks yang sesuai dan tidak ada bagian lain dalam laporan yang cocok dengan persyaratan ini.',
      recommendation: 'Tambahkan setidaknya satu tindakan pencegahan, sebutkan penanggung jawab, dan beri tenggat waktu.',
    },
    {
      id: 'F-06', title: 'Komunikasi pemangku kepentingan', summary: 'Notifikasi internal tercatat, tetapi pembaruan ke pelanggan tidak jelas.',
      status: 'needs_review', severity: 'major', sopRef: 'SOP 6.1', templateSection: '7 · Log komunikasi',
      requirement: { ref: 'SOP 6.1', text: 'Pemangku kepentingan, termasuk pelanggan bila terdampak, harus diberi tahu dalam batas waktu SOP dan notifikasinya harus dicatat.' },
      evidence: [
        rep('E-06a', 'Notifikasi tim internal dikirim pada 09:18 UTC.', 'Bagian Komunikasi'),
        rep('E-06b', 'Pembaruan komunikasi kepada pelanggan telah disampaikan.', null),
      ],
      explanation: 'Notifikasi internal pada 09:18 UTC tercatat. Pembaruan kepada pelanggan hanya disebut tanpa waktu, kanal, atau audiens, sehingga AI tidak dapat memastikan apakah memenuhi SOP 6.1.',
      recommendation: 'Lampirkan komunikasi ke pelanggan beserta waktu dan kanal pengiriman agar peninjau dapat memeriksanya terhadap SOP 6.1.',
    },
  ]
}

const sopBase = [
  { ref: '4.2', label: 'Catat stempel waktu deteksi dan pemulihan', findingId: 'F-01' },
  { ref: '4.3', label: 'Rangkum dampak bisnis', findingId: 'F-02' },
  { ref: '5.1', label: 'Dokumentasikan akar masalah beserta bukti', findingId: 'F-03' },
  { ref: '5.2', label: 'Cantumkan tindakan korektif yang dilakukan', findingId: 'F-04' },
  { ref: '5.3', label: 'Tetapkan tindakan pencegahan dan penanggung jawab', findingId: 'F-05' },
  { ref: '6.1', label: 'Catat komunikasi pemangku kepentingan', findingId: 'F-06' },
]
const templateBase: { ref: string; label: string; findingId?: string; status?: FindingStatus }[] = [
  { ref: '1', label: 'Metadata insiden', status: 'fulfilled' },
  { ref: '2', label: 'Linimasa insiden', findingId: 'F-01' },
  { ref: '3', label: 'Dampak bisnis', findingId: 'F-02' },
  { ref: '4', label: 'Analisis akar masalah', findingId: 'F-03' },
  { ref: '5', label: 'Tindakan korektif', findingId: 'F-04' },
  { ref: '6', label: 'Tindakan pencegahan', findingId: 'F-05' },
  { ref: '7', label: 'Log komunikasi', findingId: 'F-06' },
  { ref: '8', label: 'Keterlibatan pihak ketiga', status: 'na' },
]
const recsV1 = [
  { id: 'R-1', findingId: 'F-05', text: 'Tambahkan tindakan pencegahan beserta penanggung jawab dan tenggat waktu.', detail: 'SOP 5.3 mewajibkan setiap insiden Mayor ditutup dengan penanggung jawab yang jelas.' },
  { id: 'R-2', findingId: 'F-03', text: 'Konfirmasi akar masalah dan dukung dengan bukti.', detail: 'Rujuk catatan perubahan atau cuplikan log yang mengonfirmasi hipotesis timeout load balancer.' },
  { id: 'R-3', findingId: 'F-06', text: 'Perjelas komunikasi kepada pelanggan.', detail: 'Tambahkan waktu dan kanal pengiriman agar peninjau dapat memeriksanya terhadap batas waktu SOP 6.1.' },
]

function assemble(id: string, title: string, version: VersionId, docs: DocInfo[], checkedAt: string, findings: Finding[], summary: string, recommendations: ReviewData['recommendations']): ReviewData {
  const st = (id?: string) => findings.find((f) => f.id === id)!.status
  return {
    id, title, version, domain: DOMAIN, checkedAt, docs, summary, findings, recommendations,
    sopAssessment: sopBase.map((r) => ({ ref: r.ref, label: r.label, status: st(r.findingId) })),
    templateAssessment: templateBase.map((r) => ({ ref: r.ref, label: r.label, status: r.status ?? st(r.findingId) })),
  }
}

/** V1: tinjauan simulasi awal. */
export function buildV1(docs: DocInfo[], checkedAt: string, id: string = REVIEW_ID, title: string = REVIEW_TITLE): ReviewData {
  return assemble(id, title, 'V1', docs, checkedAt, findingsFor(docs[2].name),
    'Laporan mencatat waktu deteksi dan pemulihan, dampak selama 51 menit, serta tindakan korektif. Tiga hal perlu perhatian: akar masalah baru berupa hipotesis, tidak ada tindakan pencegahan atau penanggung jawab, dan pembaruan ke pelanggan tidak jelas sehingga perlu ditinjau manusia.',
    recsV1)
}

/** V2: dibuat oleh pemeriksaan ulang simulasi. Hanya Akar Masalah yang berubah; temuan lain dibawa apa adanya. */
export function buildV2(v1: ReviewData, rev: Revision, checkedAt: string): ReviewData {
  const base = v1.docs[2].name
  const name = base.replace(/(\.\w+)$/, '_rev2$1')
  const docs = v1.docs.map((d) => (d.role === 'Laporan' ? { ...d, name, meta: 'Laporan revisi (simulasi)' } : d))
  const findings = v1.findings.map((f): Finding => {
    const evidence = f.evidence.map((e) => ({ ...e, docName: name }))
    if (f.id !== 'F-03') return { ...f, evidence }
    return {
      ...f,
      status: 'fulfilled',
      summary: 'Bukti pendukung telah ditambahkan pada akar masalah.',
      evidence: [
        { id: 'E-03b', docRole: 'Laporan Insiden', docName: name, excerpt: rev.statement.trim(), location: 'Bagian Akar Masalah (revisi)', addedInVersion: 'V2' },
        { id: 'E-03c', docRole: 'Laporan Insiden', docName: name, excerpt: rev.evidence.trim(), location: 'Bagian Akar Masalah (revisi)', addedInVersion: 'V2' },
      ],
      explanation: 'Hasil demonstrasi: bukti pendukung telah ditambahkan pada bagian Akar Masalah di V2, sehingga SOP 5.1 kini ditandai terpenuhi. Semua temuan lain tidak berubah.',
      recommendation: 'Tidak perlu tindakan lanjutan untuk persyaratan ini.',
    }
  })
  return assemble(v1.id, v1.title, 'V2', docs, checkedAt, findings,
    'Pada V2, akar masalah didukung bukti yang ditambahkan saat revisi sehingga kini terpenuhi. Dua hal masih belum selesai: tidak ada tindakan pencegahan atau penanggung jawab, dan pembaruan ke pelanggan masih perlu ditinjau manusia.',
    recsV1.filter((r) => r.id !== 'R-2'))
}

/** Tinjauan pertama dalam demo adalah skenario INC-2026-014; tinjauan mandiri berikutnya mendapat ID kosong berikutnya. */
export function nextReviewId(existing: string[]): string {
  if (!existing.includes(REVIEW_ID)) return REVIEW_ID
  const max = Math.max(...existing.map((i) => Number(i.match(/(\d+)$/)?.[1] ?? 0)))
  return `INC-2026-${String(max + 1).padStart(3, '0')}`
}
