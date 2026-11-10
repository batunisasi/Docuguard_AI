import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildV1, buildV2, SAMPLE_REVISION, EMPTY_REVISION, nextReviewId, REVIEW_ID, REVIEW_TITLE, slotMeta, stages, type DocInfo, type ReviewData, type Revision, type SlotId, type VersionId } from '../data/review'
import { sampleRecords, type HistoryRecord } from '../data/history'
import { isScreen } from '../data/screens'
import type { FindingStatus } from '../data/status'
import { extOf, formatSize, validateFile } from '../lib/validateFile'
import { scoreOf } from '../lib/score'
import { isClearReview } from '../lib/clearStatus'
import { runReview, fetchReviews, fetchReview, type ReportType } from '../lib/backend'

/* ------------------------------------------------------------------
   DemoStore: the single source of truth for the whole prototype.
   - `cases` holds every review created in the demo (never silently deleted).
   - Human review records belong to one specific version of one case.
   - The URL hash mirrors the current screen / review / version.
   - State is persisted in localStorage; Reset demo clears it.
   ------------------------------------------------------------------ */

const STORAGE_KEY = 'docuguard-live-state-v1'
// Identitas khusus, tidak pernah sama dengan UUID review dari backend.
const DEMO_CASE_ID = 'DEMO-INC-2026-014'

export type Slot = {
  file: { name: string; size: number; lastModified?: number } | null
  status: 'empty' | 'uploading' | 'ready' | 'invalid'
  progress: number
  error?: string
  code?: string
}
export type Processing = { mode: 'initial' | 'recheck' | null; status: 'idle' | 'running' | 'failed' | 'done'; step: number; failDemo: boolean }
export type HumanEvent = { id: number; by: 'ai' | 'human'; label: string; detail?: string; at: string }
/** The reviewer record is stored separately from the AI assessment, which is never modified. */
export type HumanState = {
  status: 'pending' | 'draft' | 'reviewed'
  determination: FindingStatus | null
  notes: string
  reviewer: string
  at: string | null
  events: HumanEvent[]
}
export type Case = {
  id: string
  title: string
  reviews: Partial<Record<VersionId, ReviewData>>
  /** One human review record per version. */
  hr: Partial<Record<VersionId, HumanState>>
  revision: Revision
}
export type Toast = { id: number; tone: 'success' | 'info' | 'warning' | 'error'; text: string }
export type Visited = { findings: boolean; human: boolean; history: boolean; compare: boolean }

type State = {
  active: string
  slots: Record<SlotId, Slot>
  textConfirmed: boolean
  slotsConsumed: boolean
  processing: Processing
  cases: Case[]
  currentId: string | null
  viewVersion: VersionId
  sampleTarget: { id: string; version: string } | null
  focusFinding: string | null
  visited: Visited
  notifSeen: string[]
  toast: Toast | null
  unsaved: boolean
  resetOpen: boolean
  revisionOpen: boolean
}

const blank: Slot = { file: null, status: 'empty', progress: 0 }
const reviewer = 'Ummu Diana'

/** Demo clock: fixed demo date, real time of day. */
export const demoNow = () => new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

let toastId = 1
const toast = (tone: Toast['tone'], text: string): Toast => ({ id: toastId++, tone, text })

const newHuman = (label: string, detail: string): HumanState => ({
  status: 'pending', determination: null, notes: '', reviewer, at: null,
  events: [{ id: 0, by: 'ai', label, detail, at: demoNow() }],
})
const pendingHuman = (): HumanState => ({ status: 'pending', determination: null, notes: '', reviewer, at: null, events: [] })
const pushEvent = (hr: HumanState, label: string, detail?: string): HumanEvent[] => [...hr.events, { id: hr.events.length, by: 'human', label, detail, at: demoNow() }]

const initialState = (): State => ({
  active: 'dashboard',
  slots: { sop: blank, template: blank, report: blank },
  textConfirmed: false,
  slotsConsumed: false,
  processing: { mode: null, status: 'idle', step: 0, failDemo: false },
  cases: [],
  currentId: null,
  viewVersion: 'V1',
  sampleTarget: null,
  focusFinding: null,
  visited: { findings: false, human: false, history: false, compare: false },
  notifSeen: [],
  toast: null,
  unsaved: false,
  resetOpen: false,
  revisionOpen: false,
})

/* ---- persistence ---- */
function load(): State {
  const base = initialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<State>
    const slots = { ...base.slots, ...(saved.slots ?? {}) }
    // an interrupted upload cannot resume
    ;(Object.keys(slots) as SlotId[]).forEach((k) => { if (slots[k].status === 'uploading') slots[k] = blank })
    return { ...base, ...saved, slots, toast: null, unsaved: false, resetOpen: false, revisionOpen: false }
  } catch { return base }
}
function persist(s: State) {
  try {
    const { toast: _t, unsaved: _u, resetOpen: _r, revisionOpen: _v, ...rest } = s
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch { /* storage unavailable: demo still works without persistence */ }
}

/* ---- hash routing: #/screen?c=<review id>&v=<version> ---- */
type Route = { screen: string; c?: string; v?: string }
const CASE_SCREENS = ['result', 'findings', 'human', 'compare']
function parseHash(): Route | null {
  const m = window.location.hash.match(/^#\/([a-z]+)(?:\?(.*))?$/)
  if (!m || !isScreen(m[1])) return null
  const q = new URLSearchParams(m[2] ?? '')
  return { screen: m[1], c: q.get('c') ?? undefined, v: q.get('v') ?? undefined }
}
const buildHash = (screen: string, c: string | null, v: string) =>
  `#/${screen}${CASE_SCREENS.includes(screen) && c ? `?c=${encodeURIComponent(c)}&v=${v}` : ''}`

const docMeta = (name: string, size: number) => `${extOf(name).toUpperCase()} · ${formatSize(size)}`
const docsFromSlots = (slots: Record<SlotId, Slot>): DocInfo[] =>
  slotMeta.map((m, i) => {
    const f = slots[m.id].file ?? m.sample
    return { role: ['SOP', 'Templat', 'Laporan'][i], name: f.name, meta: docMeta(f.name, f.size) }
  })
const latestOf = (c?: Case | null): VersionId | null => (c?.reviews.V2 ? 'V2' : c?.reviews.V1 ? 'V1' : null)
const mapCase = (s: State, id: string | null, fn: (c: Case) => Case): State => ({ ...s, cases: s.cases.map((c) => (c.id === id ? fn(c) : c)) })

type Guard = { dirty: boolean; save: () => void; discard: () => void } | null

export type Demo = ReturnType<typeof useDemoValue>
const DemoContext = createContext<Demo | null>(null)

function useDemoValue() {
  const [state, setState] = useState<State>(() => {
    const s = load()
    const r = parseHash()
    if (r) {
      const c = s.cases.find((x) => x.id === r.c)
      return { ...s, active: r.screen, currentId: c ? c.id : s.currentId, viewVersion: c && r.v && c.reviews[r.v as VersionId] ? (r.v as VersionId) : s.viewVersion }
    }
    return s
  })
  const timers = useRef<Partial<Record<SlotId, number>>>({})
  const realFiles = useRef<Partial<Record<SlotId, File>>>({})
  const guard = useRef<Guard>(null)
  const pending = useRef<(() => void) | null>(null)
  const ref = useRef(state)
  ref.current = state

  const patch = useCallback((p: Partial<State>) => setState((s) => ({ ...s, ...p })), [])
  const stopUpload = (id: SlotId) => { window.clearInterval(timers.current[id]); delete timers.current[id] }
  const stopAll = () => (Object.keys(timers.current) as SlotId[]).forEach(stopUpload)
  const say = useCallback((tone: Toast['tone'], text: string) => patch({ toast: toast(tone, text) }), [patch])
  const dismissToast = useCallback(() => patch({ toast: null }), [patch])

  /* ---- unsaved-changes protection (shared by navigation, version switch, new review, reset) ---- */
  const withGuard = useCallback((run: () => void) => {
    if (guard.current?.dirty) { pending.current = run; patch({ unsaved: true }); return }
    run()
  }, [patch])
  const registerGuard = useCallback((g: Guard) => { guard.current = g }, [])
  const resolveUnsaved = useCallback((choice: 'save' | 'discard' | 'cancel') => {
    const run = pending.current
    pending.current = null
    patch({ unsaved: false })
    if (choice === 'cancel' || !run) return
    if (choice === 'save') guard.current?.save()
    else guard.current?.discard()
    run()
  }, [patch])

  /* ---- navigation ---- */
  const applyScreen = useCallback((id: string, extra?: { c?: string; v?: string }) => {
    window.scrollTo({ top: 0 })
    setState((s) => {
      const c = extra?.c ? s.cases.find((x) => x.id === extra.c) : undefined
      const v = c && extra?.v && c.reviews[extra.v as VersionId] ? (extra.v as VersionId) : null
      let next: State = {
        ...s, active: id, sampleTarget: null,
        currentId: c ? c.id : s.currentId,
        viewVersion: v ?? (c ? latestOf(c) ?? 'V1' : s.viewVersion),
        visited: { ...s.visited, ...(id in s.visited ? { [id]: true } : {}) } as Visited,
        // Leaving a finished processing run resets it so it does not redirect again on the next visit.
        processing: s.active === 'processing' && id !== 'processing' && s.processing.status === 'done' ? { ...s.processing, status: 'idle' } : s.processing,
      }
      // Entering New Review after a review consumed the uploads starts a clean upload form.
      if (id === 'new' && s.slotsConsumed) next = { ...next, slots: { sop: blank, template: blank, report: blank }, textConfirmed: false, slotsConsumed: false }
      return next
    })
  }, [])
  const go = useCallback((id: string) => applyScreen(id), [applyScreen])
  const navigate = useCallback((id: string) => {
    if (id === 'human' && ref.current.active === 'human') return
    // Unggah dokumen asli selalu keluar dari mode demo sebelum mengirim ke backend.
    if (id === 'new' && ref.current.currentId === DEMO_CASE_ID) {
      withGuard(() => {
        window.scrollTo({ top: 0 })
        setState(s => {
          const realCases = s.cases.filter(c => c.id !== DEMO_CASE_ID)
          return {
            ...s, cases: realCases,
            currentId: realCases.length ? realCases[realCases.length - 1].id : null,
            active: 'new', viewVersion: 'V1', sampleTarget: null, focusFinding: null,
            slots: { sop: blank, template: blank, report: blank }, slotsConsumed: false,
            textConfirmed: false,
          }
        })
      })
      return
    }
    withGuard(() => { patch({ focusFinding: null }); applyScreen(id) })
  }, [withGuard, applyScreen, patch])

  // state -> URL (push on screen change, replace on review/version change)
  const firstSync = useRef(true)
  useEffect(() => {
    const want = buildHash(state.active, state.currentId, state.viewVersion)
    if (window.location.hash === want) { firstSync.current = false; return }
    const screenChanged = parseHash()?.screen !== state.active
    if (firstSync.current || !screenChanged) window.history.replaceState(null, '', want)
    else window.history.pushState(null, '', want)
    firstSync.current = false
  }, [state.active, state.currentId, state.viewVersion])

  // URL -> state (browser Back / Forward / manual edit)
  useEffect(() => {
    const onHash = () => {
      const r = parseHash()
      const s = ref.current
      if (!r) return
      const same = r.screen === s.active && (!CASE_SCREENS.includes(r.screen) || (r.c === s.currentId && r.v === s.viewVersion))
      if (same) return
      if (guard.current?.dirty && s.active === 'human' && r.screen !== 'human') {
        // keep the user on Human Review and ask first
        window.history.replaceState(null, '', buildHash(s.active, s.currentId, s.viewVersion))
        pending.current = () => applyScreen(r.screen, { c: r.c, v: r.v })
        patch({ unsaved: true })
        return
      }
      applyScreen(r.screen, { c: r.c, v: r.v })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [applyScreen, patch])

  // persistence
  useEffect(() => { persist(state) }, [state])

  // Muat riwayat nyata dari PostgreSQL melalui backend saat aplikasi dibuka.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchReviews()
        const rows = (list.items || []).filter((r: any) => r.status !== 'FAILED').slice(0, 30)
        const responses = await Promise.allSettled(rows.map((r: any) => fetchReview(r.id)))
        // V2 disimpan backend sebagai review baru dengan parent_review_id.
        // Gabungkan V1/V2 menjadi satu kasus di UI, tetapi simpan UUID backend asli.
        const casesByRoot = new Map<string, Case>()
        const ordered = responses.map((res, i) => ({ res, row: rows[i] }))
          .sort((a, b) => Number(a.row.version_no ?? 1) - Number(b.row.version_no ?? 1))
        ordered.forEach(({ res, row }) => {
          if (res.status !== 'fulfilled') return
          const result = res.value.item?.results
          const front = result?.frontend_review
          if (!front || !Array.isArray(front.findings)) return
          const rootId = String(row.parent_review_id || row.id)
          const version: VersionId = Number(row.version_no) > 1 ? 'V2' : 'V1'
          const data: ReviewData = {
            ...front, id: rootId, serverReviewId: String(row.id), reportType: row.report_type as ReportType, version,
            title: front.title || row.original_filename, domain: ({ incident: 'Laporan Insiden', sales: 'Laporan Penjualan', budget: 'Laporan Anggaran' } as Record<string,string>)[row.report_type] || front.domain || 'Dokumen Umum',
            docs: (front.docs || []).map((d: DocInfo) => ({...d, role: d.role === 'Template' ? 'Templat' : d.role})),
            findings: front.findings.map((f: ReviewData['findings'][number]) => ({...f, evidence: (f.evidence || []).map(e => ({...e, docRole: 'Laporan Insiden' as const}))}))
          }
          const existing = casesByRoot.get(rootId)
          const hr = newHuman('Pemeriksaan dari server', 'Status AI: ' + row.status)
          if (existing) {
            existing.reviews[version] = data
            existing.hr[version] = hr
          } else {
            casesByRoot.set(rootId, {
              id: rootId, title: data.title,
              reviews: { [version]: data }, hr: { [version]: hr }, revision: EMPTY_REVISION
            })
          }
        })
        if (!cancelled) setState(s => {
          const serverCases = [...casesByRoot.values()].map(c => {
            const local = s.cases.find(x => x.id === c.id)
            return local ? { ...c, hr: { ...c.hr, ...local.hr }, revision: local.revision } : c
          })
          return { ...s, cases: [...serverCases, ...s.cases.filter(c => !casesByRoot.has(c.id))] }
        })
      } catch (e) {
        if (!cancelled) say('warning', 'Backend belum dapat dihubungi: ' + (e instanceof Error ? e.message : String(e)))
      }
    })()
    return () => { cancelled = true }
  }, [say])

  /* ---- opening reviews ---- */
  const showCase = useCallback((id: string, version: VersionId | undefined, screen: string, extra: Partial<State> = {}) => {
    withGuard(() => {
      const c = ref.current.cases.find((x) => x.id === id)
      if (!c) { say('error', `${id} tidak memiliki tinjauan rinci dalam demo ini.`); return }
      const v = version && c.reviews[version] ? version : latestOf(c) ?? 'V1'
      setState((s) => ({ ...s, currentId: id, viewVersion: v, ...extra }))
      applyScreen(screen, { c: id, v })
    })
  }, [withGuard, say, applyScreen])
  const openRecord = useCallback((id: string, version: string) => {
    if (ref.current.cases.some((c) => c.id === id)) { showCase(id, version as VersionId, 'result'); return }
    withGuard(() => { setState((p) => ({ ...p, active: 'result', sampleTarget: { id, version } })); window.scrollTo({ top: 0 }) })
  }, [showCase, withGuard])
  const openCompare = useCallback((id: string) => showCase(id, 'V2', 'compare'), [showCase])
  const openHuman = useCallback((id: string, version: VersionId) => showCase(id, version, 'human'), [showCase])
  const openFinding = useCallback((id: string, version: VersionId, findingId: string) => showCase(id, version, 'findings', { focusFinding: findingId }), [showCase])
  const selectVersion = useCallback((v: VersionId) => withGuard(() => patch({ viewVersion: v })), [withGuard, patch])

  /* ---- uploads ---- */
  const addFile = useCallback((id: SlotId, name: string, size: number, opts: { lastModified?: number; declaredScanned?: boolean; file?: File } = {}) => {
    stopUpload(id)
    delete realFiles.current[id]
    if (opts.file) realFiles.current[id] = opts.file
    const set = (slot: Slot) => setState((s) => ({ ...s, slots: { ...s.slots, [id]: slot } }))
    const file = { name, size, lastModified: opts.lastModified }
    const v = validateFile(name, size, { declaredScanned: opts.declaredScanned })
    if (!v.ok) { set({ file, status: 'invalid', progress: 0, error: v.message, code: v.code }); return }
    // Potential duplicate: same name and size (and modified time when known) already used for another role.
    const other = (Object.keys(ref.current.slots) as SlotId[]).find((k) => {
      const f = ref.current.slots[k].file
      return k !== id && f && ref.current.slots[k].status !== 'invalid' && f.name.toLowerCase() === name.toLowerCase() && f.size === size && (f.lastModified === undefined || opts.lastModified === undefined || f.lastModified === opts.lastModified)
    })
    if (other) {
      const role = slotMeta.find((m) => m.id === other)!.title
      set({ file, status: 'invalid', progress: 0, code: 'duplicate', error: `File ini tampak sama dengan ${role} (nama dan ukuran sama). Setiap peran memerlukan dokumen sendiri. Ganti file ini dengan dokumen yang benar. Isi file tidak dibandingkan, jadi ini hanya pemeriksaan nama dan ukuran.` })
      return
    }
    set({ file, status: 'uploading', progress: 0 })
    let p = 0 // simulated upload progress
    timers.current[id] = window.setInterval(() => {
      p = Math.min(100, p + 10 + Math.random() * 14)
      if (p >= 100) { stopUpload(id); set({ file, status: 'ready', progress: 100 }) }
      else setState((s) => ({ ...s, slots: { ...s.slots, [id]: { ...s.slots[id], progress: p } } }))
    }, 140)
  }, [])
  const removeFile = useCallback((id: SlotId) => {
    const cur = ref.current.slots[id]
    stopUpload(id)
    delete realFiles.current[id]
    setState((s) => ({ ...s, slots: { ...s.slots, [id]: blank } }))
    const title = slotMeta.find((m) => m.id === id)!.title
    if (cur.status === 'uploading') say('info', `Unggahan ${cur.file?.name} dibatalkan. Pilih ulang file ${title} untuk mencoba lagi.`)
    else if (cur.file) say('warning', `${title} dihapus. Unggah pengganti sebelum memulai tinjauan.`)
  }, [say])
  const loadSamples = useCallback(() => {
    say('warning', 'Dokumen contoh dinonaktifkan. Gunakan unggahan asli untuk memulai pemeriksaan.')
  }, [say])
  const clearUploads = useCallback(() => { stopAll(); realFiles.current = {}; setState((s) => ({ ...s, slots: { sop: blank, template: blank, report: blank }, textConfirmed: false })) }, [])
  const setTextConfirmed = useCallback((b: boolean) => patch({ textConfirmed: b }), [patch])
  /** Demo helpers to preview the error states without needing a real bad file. */
  const addDemoFile = useCallback((kind: 'scanned' | 'format') =>
    kind === 'scanned' ? addFile('report', 'laporan-insiden-gambar.pdf', 120_000, { declaredScanned: true }) : addFile('report', 'catatan-insiden.txt', 120_000), [addFile])

  /* ---- processing simulation ---- */
  const beginProcessing = (s: State, mode: 'initial' | 'recheck'): State => ({
    ...s, active: 'processing', sampleTarget: null,
    processing: { mode, status: 'running', step: 0, failDemo: false },
  })
  const startReview = useCallback((reportType: ReportType = 'incident') => withGuard(() => {
    const current = ref.current
    if (current.slots.report.status !== 'ready' || !current.textConfirmed) return
    const files = realFiles.current
    if (!files.report) {
      say('error', 'Pilih file laporan asli sebelum memulai pemeriksaan.')
      return
    }
    window.scrollTo({ top: 0 })
    setState(s => ({ ...beginProcessing(s, 'initial'), toast: toast('info', 'Menggunakan SOP/Template tersimpan dan menjalankan n8n + Gemini...') }))
    ;(async () => {
      try {
        const response = await runReview(files.report!, undefined, reportType)
        const raw = response.review?.frontend_review
        if (!raw || !Array.isArray(raw.findings)) throw new Error('Respons workflow tidak memiliki frontend_review/findings.')
        const id = String(response.reviewId || raw.id)
        const data: ReviewData = {
          ...raw, id, reportType,
          title: raw.title || files.report!.name, domain: ({ incident: 'Laporan Insiden', sales: 'Laporan Penjualan', budget: 'Laporan Anggaran' } as Record<string,string>)[reportType],
          version: 'V1',
          docs: (raw.docs || []).map((doc: DocInfo) => ({...doc, role: doc.role === 'Template' ? 'Templat' : doc.role })),
          findings: raw.findings.map((f: ReviewData['findings'][number]) => ({
            ...f, evidence: (f.evidence || []).map(e => ({...e, docRole: 'Laporan Insiden' as const}))
          }))
        }
        const c: Case = { id, title: data.title, reviews: { V1: data }, hr: { V1: newHuman('Hasil AI tersedia', 'Status pemeriksaan awal: ' + String(response.review?.status || 'Belum tersedia') ) }, revision: EMPTY_REVISION }
        setState(s => ({ ...s, cases: [...s.cases.filter(x => x.id !== id), c], currentId: id, viewVersion: 'V1', slotsConsumed: true,
          processing: {mode: 'initial', status: 'done', step: stages.length, failDemo: false}, toast: toast('success','Hasil pemeriksaan nyata dari n8n berhasil diterima.') }))
      } catch (e) {
        setState(s => ({ ...s, processing: { ...s.processing, status: 'failed' }, toast: toast('error', e instanceof Error ? e.message : 'Gagal memproses review') }))
      }
    })()
  }), [withGuard, say])
  const startRecheck = useCallback((file: File) => {
    const current = ref.current
    const c = current.cases.find(x => x.id === current.currentId)
    if (!c?.reviews.V1) { say('error', 'Buka tinjauan V1 sebelum mengunggah versi revisi.'); return false }
    if (c.reviews.V2) { say('warning', 'V2 sudah ada untuk laporan ini.'); return false }
    const checked = validateFile(file.name, file.size)
    if (!checked.ok) { say('error', checked.message); return false }
    const parentId = c.reviews.V1.serverReviewId || c.id
    const original = c.reviews.V1
    setState(s => ({
      ...beginProcessing(s, 'recheck'),
      revisionOpen: false,
      toast: toast('info', 'Mengunggah laporan revisi ke backend dan menjalankan ulang n8n + Gemini...')
    }))
    ;(async () => {
      try {
        const response = await runReview(file, parentId, original.reportType || 'incident')
        const raw = response.review?.frontend_review
        if (!raw || !Array.isArray(raw.findings) || !Array.isArray(raw.sopAssessment) || !Array.isArray(raw.templateAssessment)) {
          throw new Error('n8n tidak mengembalikan hasil pemeriksaan SOP dan templat yang lengkap.')
        }
        const actualId = String(response.reviewId || '')
        const docs = Array.isArray(raw.docs) && raw.docs.length >= 3
          ? raw.docs.map((d: DocInfo) => ({ ...d, role: d.role === 'Template' ? 'Templat' : d.role }))
          : original.docs.map((d, i) => i === 2 ? { ...d, name: file.name, meta: docMeta(file.name, file.size) } : d)
        const v2: ReviewData = {
          ...raw, id: c.id, serverReviewId: actualId, reportType: original.reportType || 'incident', version: 'V2',
          title: raw.title || file.name, docs, domain: ({ incident: 'Laporan Insiden', sales: 'Laporan Penjualan', budget: 'Laporan Anggaran' } as Record<string,string>)[original.reportType || 'incident'],
          findings: raw.findings.map((f: ReviewData['findings'][number]) => ({
            ...f, evidence: (f.evidence || []).map(e => ({ ...e, docRole: 'Laporan Insiden' as const }))
          }))
        }
        setState(s => ({
          ...s, cases: s.cases.map(item => item.id === c.id ? {
            ...item, reviews: { ...item.reviews, V2: v2 },
            hr: { ...item.hr, V2: newHuman('Pemeriksaan ulang berhasil', 'Hasil baru dari n8n + Gemini') }
          } : item),
          currentId: c.id, viewVersion: 'V2',
          processing: { mode: 'recheck', status: 'done', step: stages.length, failDemo: false },
          toast: toast('success', 'V2 berhasil diperiksa oleh n8n. V1 tetap tersimpan dan dapat dibandingkan.')
        }))
      } catch (e) {
        setState(s => ({
          ...s, processing: { ...s.processing, status: 'failed' },
          toast: toast('error', e instanceof Error ? e.message : 'Pemeriksaan ulang gagal')
        }))
      }
    })()
    return true
  }, [say])
  const setFailDemo = useCallback((b: boolean) => setState((s) => ({ ...s, processing: { ...s.processing, failDemo: b } })), [])

  const retryProcessing = useCallback(() => {
    say('info', 'Untuk mencoba ulang, buka New Review dan unggah kembali file asli.')
    patch({ processing: {mode: null, status: 'idle', step: 0, failDemo: false} })
    applyScreen('new')
  }, [say, patch, applyScreen])
  const skipProcessing = useCallback(() => say('warning', 'Tahap pemeriksaan tidak bisa dilewati saat terhubung ke backend nyata.'), [say])

  /** Contoh fiktif sepenuhnya di browser; tidak mengirim file atau menghubungi n8n. */
  const loadDemoReview = useCallback(() => withGuard(() => {
    const docs = docsFromSlots({ sop: blank, template: blank, report: blank })
    const v1 = buildV1(docs, demoNow(), DEMO_CASE_ID, '[DEMO] Laporan insiden contoh')
    const v2 = buildV2(v1, SAMPLE_REVISION, demoNow())
    const sample: Case = {
      id: DEMO_CASE_ID, title: v1.title,
      reviews: { V1: v1, V2: v2 },
      hr: {
        V1: newHuman('SIMULASI (bukan Gemini)', 'Hasil contoh fiktif, tidak dianalisis oleh n8n.'),
        V2: newHuman('SIMULASI V2 (bukan Gemini)', 'Perubahan versi merupakan contoh fiktif.')
      },
      revision: SAMPLE_REVISION,
    }
    window.scrollTo({ top: 0 })
    setState(s => ({
      ...s,
      cases: [...s.cases.filter(c => c.id !== DEMO_CASE_ID), sample],
      currentId: DEMO_CASE_ID,
      viewVersion: 'V1',
      sampleTarget: null,
      focusFinding: null,
      active: 'result',
      revisionOpen: false,
      toast: toast('info', 'Mode Demo aktif. Semua temuan dan dokumen di layar adalah contoh fiktif. n8n tidak dipanggil.'),
    }))
  }), [withGuard])

  /** Kembali ke kasus nyata tanpa menyentuh database atau riwayat server. */
  const exitDemo = useCallback(() => withGuard(() => {
    window.scrollTo({ top: 0 })
    setState(s => {
      const realCases = s.cases.filter(c => c.id !== DEMO_CASE_ID)
      return {
        ...s,
        cases: realCases,
        currentId: realCases.length ? realCases[realCases.length - 1].id : null,
        viewVersion: 'V1',
        active: 'dashboard',
        sampleTarget: null,
        focusFinding: null,
        revisionOpen: false,
        toast: toast('info', 'Mode Demo ditutup. Data asli di backend tetap aman.'),
      }
    })
  }), [withGuard])

  /* ---- human review (per version of the current case) ---- */
  const editHr = (s: State, fn: (h: HumanState) => HumanState, t: Toast): State => ({
    ...mapCase(s, s.currentId, (c) => ({ ...c, hr: { ...c.hr, [s.viewVersion]: fn(c.hr[s.viewVersion] ?? pendingHuman()) } })), toast: t,
  })
  const saveDraft = useCallback((notes: string, determination: FindingStatus | null) =>
    setState((s) => editHr(s, (h) => ({ ...h, status: 'draft', notes, determination, events: pushEvent(h, 'Catatan tinjauan disimpan', 'Belum ditandai selesai ditinjau') }), toast('success', 'Catatan peninjau disimpan.'))), [])
  const markReviewed = useCallback((notes: string, determination: FindingStatus) =>
    setState((s) => editHr(s, (h) => ({ ...h, status: 'reviewed', notes, determination, at: demoNow(), events: pushEvent(h, 'Ditandai selesai ditinjau', `Keputusan peninjau dicatat pada ${s.viewVersion}`) }), toast('success', `Tinjauan manusia dicatat untuk ${s.viewVersion}. Penilaian AI tidak berubah.`))), [])
  const reopen = useCallback(() =>
    setState((s) => editHr(s, (h) => ({ ...h, status: 'draft', at: null, events: pushEvent(h, 'Tinjauan dibuka kembali untuk diedit') }), toast('info', 'Tinjauan dibuka kembali untuk diedit.'))), [])

  /* ---- revision ---- */
  const setRevision = useCallback((r: Revision) => setState((s) => mapCase(s, s.currentId, (c) => ({ ...c, revision: r }))), [])
  const openRevision = useCallback(() => patch({ revisionOpen: true }), [patch])
  const closeRevision = useCallback(() => patch({ revisionOpen: false }), [patch])

  /* ---- notifications ---- */
  const markNotifsSeen = useCallback((ids: string[]) => setState((s) => ({ ...s, notifSeen: [...new Set([...s.notifSeen, ...ids])] })), [])

  /* ---- reset (explicit confirmation required) ---- */
  const requestReset = useCallback(() => withGuard(() => patch({ resetOpen: true })), [withGuard, patch])
  const cancelReset = useCallback(() => patch({ resetOpen: false }), [patch])
  const confirmReset = useCallback(() => {
    stopAll(); guard.current = null; pending.current = null
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    window.scrollTo({ top: 0 })
    setState({ ...initialState(), toast: toast('info', 'Demo dikembalikan ke kondisi awal.') })
  }, [])

  useEffect(() => () => stopAll(), [])

  /* ---- derived ---- */
  const current = state.cases.find((c) => c.id === state.currentId) ?? null
  const reviews = current?.reviews ?? {}
  const latestVersion = latestOf(current)
  const hrFor = useCallback((v: VersionId): HumanState => current?.hr[v] ?? pendingHuman(), [current])
  const hr = hrFor(state.viewVersion)
  const anyReviewed = current ? Object.values(current.hr).some((h) => h?.status === 'reviewed') : false

  const history = useMemo<HistoryRecord[]>(() => {
    const live: HistoryRecord[] = [...state.cases].reverse().flatMap((c) => {
      const latest = latestOf(c)
      return (['V2', 'V1'] as const).filter((v) => c.reviews[v]).map((v) => ({
        key: `${c.id}-${v}`, id: c.id, title: c.title, report: c.reviews[v]!.docs[2].name, version: v, date: c.reviews[v]!.checkedAt,
        status: isClearReview(c.reviews[v]!) ? ('clear' as const) : c.hr[v]?.status === 'reviewed' ? ('human_reviewed' as const) : ('awaiting_human' as const), latest: v === latest,
        sop: scoreOf(c.reviews[v]!.sopAssessment).pct, tpl: scoreOf(c.reviews[v]!.templateAssessment).pct,
      }))
    })
    return live
  }, [state.cases])

  return {
    ...state, demoMode: current?.id === DEMO_CASE_ID, current, reviews, revision: current?.revision ?? EMPTY_REVISION, latestVersion, history, hr, hrFor, anyReviewed,
    allReady: Object.values(state.slots).every((s) => s.status === 'ready'),
    readyCount: Object.values(state.slots).filter((s) => s.status === 'ready').length,
    navigate, go, registerGuard, resolveUnsaved, withGuard, openRecord, openCompare, openHuman, openFinding, selectVersion,
    addFile, removeFile, loadSamples, clearUploads, addDemoFile, setTextConfirmed,
    startReview, startRecheck, setFailDemo, retryProcessing, skipProcessing, loadDemoReview, exitDemo,
    saveDraft, markReviewed, reopen,
    setRevision, openRevision, closeRevision, markNotifsSeen,
    requestReset, cancelReset, confirmReset,
    say, dismissToast,
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useDemoValue()
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const c = useContext(DemoContext)
  if (!c) throw new Error('useDemo must be used inside DemoProvider')
  return c
}

/** Convenience slices (kept so screens stay readable). */
export function useReviewFlow() {
  const d = useDemo()
  return { slots: d.slots, readyCount: d.readyCount, allReady: d.allReady, addFile: d.addFile, removeFile: d.removeFile, loadSamples: d.loadSamples, reset: d.clearUploads }
}
/** The human review record of the version currently being viewed. */
export function useHumanReview() {
  const d = useDemo()
  return { ...d.hr, saveDraft: d.saveDraft, markReviewed: d.markReviewed, reopen: d.reopen }
}
/** The review for the version being viewed, or null when none exists yet. */
export function useViewedReview() {
  const d = useDemo()
  return d.reviews[d.viewVersion] ?? (d.latestVersion ? d.reviews[d.latestVersion]! : null)
}
