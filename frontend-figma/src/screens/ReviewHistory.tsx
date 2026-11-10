import { useMemo, useState } from 'react'
import type { HistoryRecord } from '../data/history'
import { stepEyebrow } from '../data/screens'
import { useDemo } from '../state/DemoStore'
import { REVIEW_STATE_META, type ReviewState } from '../data/status'
import { Button } from '../components/ui/Button'
import { FilterChips } from '../components/ui/FilterChips'
import { GlassPanel } from '../components/ui/Glass'
import { Icon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/States'
import { Tag } from '../components/ui/StatusBadge'

type Filter = 'all' | ReviewState


export function ReviewHistory() {
  const { history: historyRecords, cases, openRecord: onOpenResult, openCompare, navigate } = useDemo()
  const hasDetail = (id: string) => cases.some((c) => c.id === id)
  const canCompare = (r: HistoryRecord) => !!cases.find((c) => c.id === r.id)?.reviews.V2
  const [previewEmpty, setPreviewEmpty] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [latestOnly, setLatestOnly] = useState(false)
  const [selectedKey, setSelectedKey] = useState(historyRecords[0]?.key ?? '')

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return historyRecords.filter((r) =>
      (filter === 'all' || r.status === filter) && (!latestOnly || r.latest) &&
      (!t || [r.id, r.title, r.report].some((x) => x.toLowerCase().includes(t))))
  }, [q, filter, latestOnly])

  const selected = historyRecords.find((r) => r.key === selectedKey) ?? historyRecords[0]
  const latestRec = historyRecords.find((r) => r.id === selected.id && r.latest)
  const versions = historyRecords.filter((r) => r.id === selected.id)
  const count = (s: ReviewState) => historyRecords.filter((r) => r.status === s).length
  const clear = () => { setQ(''); setFilter('all'); setLatestOnly(false) }

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{stepEyebrow('history', 'Riwayat tinjauan')}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Setiap tinjauan, setiap versi</h1>
        <p className="mt-1.5 text-ink-2">Pilih catatan untuk melihat versinya. Buka hasil atau bandingkan versi dari laporan yang sama. Sebagian catatan adalah contoh.</p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <section className="surface overflow-hidden xl:col-span-8" aria-label="Catatan tinjauan">
          <div className="space-y-3 p-4 sm:p-5">
            <label className="flex h-11 items-center gap-2 rounded-control border border-navy/15 bg-paper px-3.5 text-ink-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Icon name="search" size={18} /><span className="sr-only">Cari riwayat tinjauan</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari berdasarkan ID tinjauan, nama laporan, atau judul" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" />
              {q && <button onClick={() => setQ('')} aria-label="Hapus pencarian" className="grid size-7 place-items-center rounded-full hover:bg-navy/8"><Icon name="close" size={14} /></button>}
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterChips<Filter> label="Filter berdasarkan status" value={filter} onChange={setFilter} options={[
                { id: 'all', label: 'Semua', count: historyRecords.length },
                { id: 'awaiting_human', label: 'Menunggu tinjauan manusia', count: count('awaiting_human') },
                { id: 'human_reviewed', label: 'Sudah ditinjau manusia', count: count('human_reviewed') },
                { id: 'rejected_file', label: 'File ditolak', count: count('rejected_file') },
              ]} />
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-2">
                <input type="checkbox" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />Hanya versi terbaru
              </label>
            </div>
          </div>

          {previewEmpty || historyRecords.length === 0 ? (
            <EmptyState icon="history" title="Belum ada tinjauan" body="Tinjauan yang selesai beserta versinya akan muncul di sini. Unggah dokumen untuk membuat tinjauan pertama Anda." action={<div className="flex gap-2"><Button onClick={() => navigate('new')}>Mulai tinjauan</Button>{previewEmpty && <Button variant="glass" onClick={() => setPreviewEmpty(false)}>Keluar dari pratinjau</Button>}</div>} />
          ) : rows.length === 0 ? (
            <EmptyState icon="search" title="Tidak ada tinjauan yang cocok" body="Coba kata kunci lain atau hapus filter." action={<Button variant="glass" onClick={clear}>Hapus filter</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <caption className="sr-only">Riwayat tinjauan. Pilih baris untuk melihat detailnya.</caption>
                <thead><tr className="border-y border-navy/8 bg-canvas/70 text-xs text-ink-3">
                  {['Tinjauan', 'Laporan insiden', 'Tanggal', 'Versi', 'SOP', 'Templat', 'Status', 'Aksi'].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold first:sm:pl-5">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-navy/5">
                  {rows.map((r) => {
                    const on = r.key === selectedKey
                    return (
                      <tr key={r.key} onClick={() => setSelectedKey(r.key)} tabIndex={0} aria-current={on ? 'true' : undefined}
                        aria-label={`${r.id} ${r.version}${r.latest ? ' terbaru' : ' digantikan'}, ${REVIEW_STATE_META[r.status].text}. Tekan Enter untuk memilih.`}
                        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelectedKey(r.key) } }}
                        className={`cursor-pointer transition-colors ${on ? 'bg-brand-soft/80' : 'hover:bg-brand-soft/40'}`}>
                        <td className="px-4 py-3.5 sm:pl-5">
                          <span className="font-semibold">{r.id}</span>
                        </td>
                        <td className="max-w-[16rem] px-4 py-3.5"><p className="font-medium">{r.title}</p><p className="text-xs text-ink-3 [overflow-wrap:anywhere]">{r.report}</p></td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-ink-3">{r.date}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Tag tone="neutral">{r.version}</Tag>{r.latest ? <Tag>Terbaru</Tag> : <Tag tone="neutral">Digantikan</Tag>}</span></td>
                        <td className="px-4 py-3.5 font-semibold tabular-nums">{r.sop !== undefined ? `${r.sop}%` : <span className="font-normal text-ink-3" title="Tidak ada data rinci untuk catatan contoh">—</span>}</td>
                        <td className="px-4 py-3.5 font-semibold tabular-nums">{r.tpl !== undefined ? `${r.tpl}%` : <span className="font-normal text-ink-3" title="Tidak ada data rinci untuk catatan contoh">—</span>}</td>
                        <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${REVIEW_STATE_META[r.status].cls}`}>{REVIEW_STATE_META[r.status].text}</span></td>
                        <td className="px-4 py-3.5"><div className="flex gap-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button variant="glass" className="!min-h-9 !px-3 text-xs" onClick={() => onOpenResult(r.id, r.version)} aria-label={`Lihat hasil ${r.id} ${r.version}`}>Lihat hasil</Button>
                          {canCompare(r) && <Button variant="ghost" className="!min-h-9 !px-3 text-xs" onClick={() => openCompare(r.id)} aria-label={`Bandingkan versi ${r.id}`}>Bandingkan</Button>}
                        </div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/8 px-5 py-3 text-xs text-ink-3"><span>Menampilkan {rows.length} dari {historyRecords.length} catatan. Catatan contoh tidak memiliki temuan rinci; tinjauan yang dibuat dalam demo ini memilikinya.</span><button onClick={() => setPreviewEmpty(true)} className="font-semibold text-brand underline underline-offset-2">Pratinjau kondisi kosong</button></p>
        </section>

        <aside className="xl:sticky xl:top-5 xl:col-span-4" aria-label="Detail tinjauan terpilih">
          <GlassPanel variant="glass-strong" className="p-5 sm:p-6">
            <p className="eyebrow mb-1">Tinjauan terpilih</p>
            <h2 className="text-xl font-semibold tracking-tight">{selected.id}</h2>
            <p className="mt-0.5 text-sm text-ink-2">{selected.title}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs font-semibold text-ink-3">File laporan</dt><dd className="font-medium break-words">{selected.report}</dd></div>
              <div><dt className="text-xs font-semibold text-ink-3">Ditinjau</dt><dd className="font-medium">{selected.date}</dd></div>
              {selected.sop !== undefined && selected.tpl !== undefined && (
                <div><dt className="text-xs font-semibold text-ink-3">Kesesuaian</dt><dd className="mt-1 flex flex-wrap gap-2"><Tag>SOP {selected.sop}%</Tag><Tag>Templat {selected.tpl}%</Tag></dd></div>
              )}
              <div><dt className="text-xs font-semibold text-ink-3">Status</dt><dd className="mt-1"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REVIEW_STATE_META[selected.status].cls}`}>{REVIEW_STATE_META[selected.status].text}</span></dd></div>
            </dl>

            <p className="mt-5 mb-2 text-xs font-semibold text-ink-3">Linimasa versi</p>
            <ol className="space-y-0">
              {versions.map((v, i) => (
                <li key={v.key} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < versions.length - 1 && <span aria-hidden="true" className="absolute top-6 bottom-0 left-[9px] w-0.5 bg-navy/10" />}
                  <span className={`relative z-10 mt-1 size-5 shrink-0 rounded-full border-2 ${v.key === selected.key ? 'border-brand bg-brand' : 'border-sage bg-paper'}`} />
                  <button onClick={() => setSelectedKey(v.key)} className="text-left text-sm"><span className="font-semibold">{v.version}{v.latest ? ' · Terbaru' : ' · Digantikan'}</span><span className="block text-xs text-ink-3">{v.date}</span></button>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button icon="arrow" onClick={() => onOpenResult(selected.id, selected.version)}>Lihat hasil</Button>
              {hasDetail(selected.id) && latestRec && latestRec.key !== selected.key && <Button variant="ghost" onClick={() => onOpenResult(latestRec.id, latestRec.version)}>Kembali ke terbaru ({latestRec.version})</Button>}
              {canCompare(selected)
                ? <Button variant="glass" icon="compare" onClick={() => openCompare(selected.id)}>Bandingkan versi</Button>
                : <p className="w-full text-xs text-ink-3">{hasDetail(selected.id) ? 'Baru ada V1. Buka hasilnya, revisi akar masalah, lalu periksa ulang untuk membuat V2.' : versions.length > 1 ? 'Perbandingan untuk catatan contoh ini tidak termasuk dalam demo.' : 'Hanya ada satu versi sehingga tidak ada yang dibandingkan.'}</p>}
            </div>
          </GlassPanel>
        </aside>
      </div>
    </div>
  )
}
