import type { Finding } from '../../data/review'
import { Icon } from '../ui/Icon'
import { StatusBadge, Tag } from '../ui/StatusBadge'

/** Shared evidence inspector (used by Findings and Human Review). Solid surfaces keep excerpts readable. */
export function EvidenceViewer({ finding, sopDoc, evidenceId, onSelect }: { finding: Finding; sopDoc: string; evidenceId?: string | null; onSelect?: (id: string) => void }) {
  const ev = finding.evidence.find((e) => e.id === evidenceId) ?? finding.evidence[0]

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow mb-1">{finding.id} · Detail bukti</p>
        <h3 className="text-base font-semibold tracking-tight">{finding.title}</h3>
      </div>

      {finding.evidence.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kutipan bukti">
          {finding.evidence.map((e, i) => (
            <button key={e.id} aria-pressed={e.id === ev?.id} onClick={() => onSelect?.(e.id)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${e.id === ev?.id ? 'bg-brand text-white' : 'bg-navy/5 text-ink-2 hover:bg-navy/10'}`}>
              Kutipan {i + 1}{e.addedInVersion ? ` · ditambahkan di ${e.addedInVersion}` : ''}
            </button>
          ))}
        </div>
      )}

      {ev ? (
        <>
          <figure className="surface m-0 !rounded-2xl p-4">
            <figcaption className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
              <Icon name="doc" size={14} />Kutipan dari {ev.docRole.toLowerCase()}
              {ev.addedInVersion && <Tag>Ditambahkan di {ev.addedInVersion}</Tag>}
            </figcaption>
            <blockquote className="m-0 border-l-[3px] border-sage pl-3.5 leading-relaxed text-ink">{ev.excerpt}</blockquote>
          </figure>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="glass-inset p-3"><dt className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Dokumen sumber</dt><dd className="mt-0.5 font-semibold break-words">{ev.docName}</dd></div>
            <div className="glass-inset p-3"><dt className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Lokasi</dt>
              <dd className="mt-0.5 font-semibold">{ev.location ?? <span className="font-medium text-ink-3 italic">Tidak tersedia</span>}</dd>
              {!ev.location && <p className="mt-0.5 text-xs text-ink-3">Tidak ada referensi bagian yang tercatat untuk kutipan ini.</p>}
            </div>
          </dl>
        </>
      ) : (
        <div className="surface !rounded-2xl p-5 text-center">
          <span className="mx-auto mb-2 grid size-11 place-items-center rounded-2xl bg-missing-soft text-missing"><Icon name="search" /></span>
          <p className="font-semibold">Tidak ada kutipan pendukung yang ditemukan</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">Laporan telah ditelusuri untuk persyaratan ini dan tidak ada teks yang cocok, sehingga tidak ada kutipan untuk ditampilkan.</p>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3"><Icon name="info" size={13} />Bukti demonstrasi fiktif. Bukan hasil ekstraksi dari file yang diunggah.</p>

      <div className="rounded-2xl border border-navy/8 bg-canvas/70 p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Diperiksa terhadap {finding.requirement.ref}</p>
          <StatusBadge status={finding.status} />
        </div>
        <p className="text-sm text-ink-2">{finding.requirement.text}</p>
        <p className="mt-1.5 text-xs text-ink-3">Sumber: {sopDoc}</p>
      </div>
    </div>
  )
}
