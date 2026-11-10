'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const TYPES = [
  { value: 'sales', label: 'Laporan Penjualan' },
  { value: 'budget', label: 'Laporan Anggaran' },
  { value: 'incident', label: 'Laporan Insiden TI' }
];

const typeLabel = value => TYPES.find(x => x.value === value)?.label || value || '-';
const statusLabel = status => ({
  READY_FOR_HUMAN_REVIEW: 'Waiting for human review',
  NEEDS_HUMAN_REVIEW: 'Needs human review',
  PROCESSING: 'Processing',
  FAILED: 'Failed'
}[status] || status || 'Unknown');

function morningGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Good morning';
  if (h < 15) return 'Good afternoon';
  if (h < 19) return 'Good evening';
  return 'Good evening';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export default function Home() {
  const [page, setPage] = useState('dashboard');
  const [reportType, setReportType] = useState('incident');
  const [reportFile, setReportFile] = useState(null);
  const [parentReviewId, setParentReviewId] = useState('');
  const [references, setReferences] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [refs, history] = await Promise.all([
        api('/api/references'),
        api('/api/reviews')
      ]);
      setReferences(refs.items || []);
      setReviews(history.items || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  const activeReference = (kind, type = reportType) =>
    references.find(r => r.report_type === type && r.document_kind === kind && r.is_active);

  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(r =>
      [r.original_filename, r.report_type, r.id, r.status]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
  }, [reviews, search]);

  function navigate(next) {
    setPage(next);
    setNotice('');
    setError('');
  }

  async function submitReview(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!reportFile) return setError('Please choose a report file first.');
    if (!activeReference('sop') || !activeReference('template')) {
      return setError('The active SOP and Template are not complete for this report type. Open Reference Library first.');
    }

    const form = new FormData();
    form.append('file', reportFile);
    form.append('reportType', reportType);
    if (parentReviewId) form.append('parentReviewId', parentReviewId);

    setBusy(true);
    setPage('processing');
    setNotice('Your report is being extracted and reviewed. Please keep this page open.');
    try {
      const data = await api('/api/reviews', { method: 'POST', body: form });
      setSelectedReview(data.review);
      setReportFile(null);
      setParentReviewId('');
      await refresh();
      setNotice('Review processing is complete. The result is waiting for human verification.');
      setPage('result');
    } catch (e) {
      setError(e.message);
      setNotice('');
      setPage('new');
    } finally {
      setBusy(false);
    }
  }

  async function openReview(id) {
    setError('');
    try {
      const data = await api(`/api/reviews/${id}`);
      setSelectedReview(data.item.results || {
        status: data.item.status,
        reportType: data.item.report_type,
        reportName: data.item.original_filename,
        raw: data.item
      });
      setPage('result');
    } catch (e) {
      setError(e.message);
    }
  }

  async function openComparison(row) {
    if (!row.parent_review_id) return;
    setError('');
    try {
      const data = await api(`/api/reviews/${row.parent_review_id}/compare/${row.id}`);
      setComparison(data);
      setPage('comparison');
    } catch (e) {
      setError(e.message);
    }
  }

  const latestReview = reviews[0];
  const waitingReviews = reviews.filter(r => r.human_review_required && r.status !== 'FAILED');
  const activeRefCount = references.filter(r => r.is_active).length;

  const navGroups = [
    {
      title: 'WORKSPACE',
      items: [
        ['dashboard', '▦', 'Dashboard'],
        ['new', '⇧', 'New Review'],
        ['processing', '✧', 'AI Processing'],
        ['result', '⬡', 'Review Result'],
        ['findings', '⌕', 'Findings & Evidence'],
        ['human', '♙', 'Human Review']
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        ['history', '◷', 'Review History'],
        ['comparison', '⇄', 'Version Comparison'],
        ['library', '▤', 'Reference Library']
      ]
    }
  ];

  const pageTitle = {
    dashboard: 'Dashboard',
    new: 'New Review',
    processing: 'AI Processing',
    result: 'Review Result',
    findings: 'Findings & Evidence',
    human: 'Human Review',
    history: 'Review History',
    comparison: 'Version Comparison',
    library: 'Reference Library'
  }[page];

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandShield">✓</div>
          <div className="brandWords">
            <strong>DocuGuard AI</strong>
            <span>CHECK. VERIFY. IMPROVE.</span>
          </div>
        </div>

        <nav className="sideNav">
          {navGroups.map(group => (
            <div className="navGroup" key={group.title}>
              <div className="navCaption">{group.title}</div>
              {group.items.map(([id, icon, label]) => (
                <button
                  key={id}
                  className={`navButton ${page === id ? 'selected' : ''}`}
                  onClick={() => navigate(id)}
                >
                  <span className="navIcon">{icon}</span>
                  <span>{label}</span>
                  {id === 'human' && waitingReviews.length > 0 && (
                    <span className="navCount">{waitingReviews.length}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="prototypeCard">
          <div className="prototypeTitle"><span>ⓘ</span> MVP environment</div>
          <p>AI results are generated through the connected review workflow. Final decisions remain with a human reviewer.</p>
          <div className="prototypeFoot"><span className="liveDot"/> Document review workspace</div>
        </div>

        <div className="userCard">
          <div className="userAvatar">UD</div>
          <div><strong>Ummu Diana</strong><span>IT Service Reviewer</span></div>
          <span className="userMenu">⌄</span>
        </div>
      </aside>

      <section className="mainArea">
        <header className="topHeader">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{pageTitle}</strong></div>
          <div className="headerActions">
            <div className="searchBox">
              <span>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports, e.g. INC-2026-014"/>
              <kbd>/</kbd>
            </div>
            <button className="iconButton" aria-label="Notifications" onClick={() => navigate('human')}>♧<i/></button>
            <button className="newReviewButton" onClick={() => navigate('new')}><span>＋</span> New Review</button>
          </div>
        </header>

        {(notice || error) && (
          <div className={`messageBar ${error ? 'messageError' : 'messageSuccess'}`}>
            {error || notice}
            <button onClick={() => { setNotice(''); setError(''); }}>×</button>
          </div>
        )}

        {page === 'dashboard' && (
          <div className="pageContent">
            <div className="welcomeHeading">
              <div className="dateEyebrow">{new Date().toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase()}</div>
              <h1>{morningGreeting()}, Diana<span className="cursorLine"/></h1>
              <p>{waitingReviews.length} review{waitingReviews.length === 1 ? ' is' : 's are'} waiting for a human reviewer.</p>
            </div>

            <div className="dashboardGrid">
              <section className="glassCard emptyDashboard">
                <div className="emptyState">
                  <div className="emptyIcon">✓</div>
                  {latestReview ? (
                    <>
                      <h2>Latest review is ready</h2>
                      <p>{latestReview.original_filename} has been processed. Open the result to inspect findings and evidence.</p>
                      <div className="buttonRow">
                        <button className="primaryButton" onClick={() => openReview(latestReview.id)}>Open review result</button>
                        <button className="secondaryButton" onClick={() => navigate('history')}>Review history</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>No review generated yet</h2>
                      <p>Upload an operational report to run a review using the active SOP and template stored in your Reference Library.</p>
                      <div className="buttonRow">
                        <button className="primaryButton" onClick={() => navigate('new')}>⇧ &nbsp;Start a new review</button>
                        <button className="secondaryButton" onClick={() => navigate('library')}>Open Reference Library</button>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <div className="dashboardAside">
                <section className="glassCard queueCard">
                  <div className="sectionEyebrow">QUEUE</div>
                  <h2>Needs your attention</h2>
                  <p>{waitingReviews.length ? `${waitingReviews.length} report(s) are waiting for human verification.` : 'Nothing to review yet. Generate a review to see open findings here.'}</p>
                  {waitingReviews.slice(0,2).map(r => (
                    <button className="queueItem" key={r.id} onClick={() => openReview(r.id)}>
                      <span className="queueDot"/><span>{r.original_filename}</span><b>Open →</b>
                    </button>
                  ))}
                </section>

                <section className="glassCard roadmapCard">
                  <div className="sectionEyebrow">ROADMAP</div>
                  <h2>Review journey</h2>
                  <div className="roadmapGrid">
                    {[
                      ['Dashboard','dashboard'],['New Review','new'],
                      ['AI Processing','processing'],['Review Result','result'],
                      ['Evidence Trail','findings'],['Human Review','human'],
                      ['History','history'],['Comparison','comparison']
                    ].map(([label,id]) => (
                      <button key={id} onClick={() => navigate(id)} className={page === id ? 'roadmapActive' : ''}>
                        <span>✓</span>{label}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="statsStrip">
              <MiniStat label="Total Reviews" value={reviews.length}/>
              <MiniStat label="Active References" value={activeRefCount}/>
              <MiniStat label="Waiting for Review" value={waitingReviews.length}/>
              <MiniStat label="Report Categories" value="03"/>
            </div>
          </div>
        )}

        {page === 'new' && (
          <div className="pageContent">
            <div className="pageIntro">
              <div><div className="dateEyebrow">DOCUMENT REVIEW</div><h1>Start a new review</h1><p>Upload the report you want to check. DocuGuard AI will automatically use the active SOP and template.</p></div>
              <span className="stepPill">01 / NEW REVIEW</span>
            </div>
            <div className="reviewLayout">
              <section className="glassCard uploadPanel">
                <form onSubmit={submitReview}>
                  <div className="formLabel">1. Report category <span>Required</span></div>
                  <p className="fieldDescription">Choose which operational report you want DocuGuard AI to review.</p>
                  <div className="typeChoices">
                    {TYPES.map(t => (
                      <button type="button" key={t.value} className={`typeChoice ${reportType === t.value ? 'typeSelected' : ''}`} onClick={() => setReportType(t.value)}>
                        <span className="typeRadio">{reportType === t.value ? '●' : '○'}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="formLabel">2. Upload report <span>Required</span></div>
                  <p className="fieldDescription">The report will be checked against the active SOP and template for the selected category.</p>
                  <label className="largeDropzone">
                    <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setReportFile(e.target.files?.[0] || null)}/>
                    <span className="uploadSymbol">⇧</span>
                    <strong>{reportFile ? reportFile.name : 'Drag and drop your report here'}</strong>
                    <span>{reportFile ? `${(reportFile.size / 1024 / 1024).toFixed(2)} MB · Ready to upload` : <>or <u>browse files</u> · PDF or DOCX</>}</span>
                  </label>

                  <div className="formLabel recheckLabel">3. Recheck (optional)</div>
                  <p className="fieldDescription">Select a previous review if this file is a revised version.</p>
                  <select className="selectField" value={parentReviewId} onChange={e => setParentReviewId(e.target.value)}>
                    <option value="">New review (Version 1)</option>
                    {reviews.filter(r => r.report_type === reportType).map(r => <option key={r.id} value={r.id}>{r.original_filename} · Version {r.version_no}</option>)}
                  </select>

                  <button className="primaryButton submitReview" type="submit" disabled={busy || !reportFile || !activeReference('sop') || !activeReference('template')}>
                    ✧ &nbsp; {busy ? 'Processing...' : 'Start AI Review'}
                  </button>
                  <div className="submitHint">Your report is processed using the saved reference documents. No need to upload SOP or template again.</div>
                </form>
              </section>

              <aside className="reviewAside">
                <section className="glassCard referenceStatusCard">
                  <div className="sectionEyebrow">REFERENCE STATUS</div>
                  <h2>{typeLabel(reportType)}</h2>
                  <p>Reports are checked against the active SOP and template, and each is assessed separately.</p>
                  <ReferenceLine label="SOP Document" item={activeReference('sop')} onClick={() => navigate('library')}/>
                  <ReferenceLine label="Report Template" item={activeReference('template')} onClick={() => navigate('library')}/>
                  <div className="readyMessage">
                    <span>ⓘ</span>
                    {activeReference('sop') && activeReference('template')
                      ? '2 of 2 reference documents ready. Upload your report to continue.'
                      : `Reference setup incomplete. Add ${!activeReference('sop') ? 'SOP' : ''}${!activeReference('sop') && !activeReference('template') ? ' and ' : ''}${!activeReference('template') ? 'Template' : ''} in Reference Library.`}
                  </div>
                  {(!activeReference('sop') || !activeReference('template')) && <button className="secondaryButton fullButton" onClick={() => navigate('library')}>Manage Reference Library →</button>}
                </section>

                <section className="glassCard acceptedCard">
                  <div className="sectionEyebrow">ACCEPTED FILES</div>
                  <div className="acceptedLine"><span className="checkMark">✓</span><span>Text-based <b>PDF</b> or <b>DOCX</b> files.</span></div>
                  <div className="acceptedLine warningLine"><span>⚠</span><b>Scanned and image-only documents are unsupported.</b></div>
                  <p className="smallNote">This MVP does not include OCR. Please upload a PDF with selectable text or a DOCX file.</p>
                  <button className="textLink" onClick={() => navigate('library')}>Manage SOP & template references ↗</button>
                </section>
              </aside>
            </div>
          </div>
        )}

        {page === 'processing' && (
          <EmptyPage icon="✧" title={busy ? 'Your report is being processed' : 'No review is being processed'} description={busy ? 'The workflow is validating the document, extracting text, checking SOP compliance and template completeness.' : 'Processing starts when you upload a report and choose Start AI Review. SOP and template are retrieved automatically from Reference Library.'} primary="Upload a report" onPrimary={() => navigate('new')} secondary="Open review history" onSecondary={() => navigate('history')}/>
        )}

        {page === 'result' && (
          selectedReview ? <ResultView result={selectedReview}/> :
          <EmptyPage icon="▤" title="No review result yet" description="No review has been generated yet. Upload a report and run the AI review, or open a previous review from Review History." primary="Start a new review" onPrimary={() => navigate('new')} secondary="Open review history" onSecondary={() => navigate('history')}/>
        )}

        {page === 'findings' && (
          selectedReview ? <FindingsView result={selectedReview}/> :
          <EmptyPage icon="⌕" title="Findings and evidence trail need a review result" description="No review has been generated yet. Upload a report and run the AI review to inspect findings, evidence quotes and recommendations." primary="Upload a report" onPrimary={() => navigate('new')} secondary="Review history" onSecondary={() => navigate('history')}/>
        )}

        {page === 'human' && (
          <div className="pageContent">
            <div className="pageIntro"><div><div className="dateEyebrow">REVIEWER WORKSPACE</div><h1>Human Review Queue</h1><p>AI findings requiring human verification. DocuGuard AI never approves a report automatically.</p></div><span className="stepPill">{waitingReviews.length} PENDING</span></div>
            <section className="glassCard tableCard">
              {waitingReviews.length ? <ReviewTable reviews={waitingReviews} onOpen={openReview} onCompare={openComparison}/> : <EmptyInline text="No reports are waiting for human review."/>}
            </section>
          </div>
        )}

        {page === 'history' && (
          <div className="pageContent">
            <div className="pageIntro"><div><div className="dateEyebrow">AUDIT & VERSION HISTORY</div><h1>Review History</h1><p>Browse completed and previous document reviews.</p></div><button className="primaryButton" onClick={() => navigate('new')}>＋ New Review</button></div>
            <section className="glassCard tableCard"><ReviewTable reviews={filteredReviews} onOpen={openReview} onCompare={openComparison}/></section>
          </div>
        )}

        {page === 'comparison' && (
          comparison ? <ComparisonView comparison={comparison}/> :
          <EmptyPage icon="⇄" title="No version comparison selected" description="Choose a revised report from Review History to compare its findings with the previous version." primary="Open review history" onPrimary={() => navigate('history')} secondary="Start a new review" onSecondary={() => navigate('new')}/>
        )}

        {page === 'library' && (
          <div className="pageContent">
            <div className="pageIntro"><div><div className="dateEyebrow">MASTER DOCUMENT REPOSITORY</div><h1>Reference Library</h1><p>Store SOPs and report templates once. DocuGuard AI will reuse the active references for every new review.</p></div></div>
            <div className="libraryLayout">
              <ReferenceUpload reportType={reportType} setReportType={setReportType} onUploaded={refresh} setNotice={setNotice} setError={setError} busy={busy} setBusy={setBusy}/>
              <section className="glassCard libraryList">
                <div className="sectionEyebrow">SAVED REFERENCES</div><h2>Document repository</h2><p>Active documents are automatically selected during review.</p>
                {references.length ? references.map(r => <div className="libraryRow" key={r.id}><div className="fileBadge">▤</div><div className="libraryFile"><strong>{r.original_filename}</strong><span>{typeLabel(r.report_type)} · {r.document_kind.toUpperCase()} · Version {r.version_no}</span></div><span className={`statusBadge ${r.is_active ? 'activeBadge' : 'archivedBadge'}`}>{r.is_active ? 'Active' : 'Archived'}</span></div>) : <EmptyInline text="No reference documents stored yet. Upload an SOP and template for each report category."/>}
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function MiniStat({label,value}) {
  return <div className="miniStat"><span>{label}</span><strong>{value}</strong></div>;
}

function ReferenceLine({label,item,onClick}) {
  return <button className="referenceLine" onClick={onClick}>
    <span className="refClock">{item ? '✓' : '◷'}</span>
    <span>{label}</span>
    <b className={item ? 'refReady' : 'refMissing'}>{item ? `Active · v${item.version_no}` : 'Missing'}</b>
  </button>;
}

function EmptyPage({icon,title,description,primary,onPrimary,secondary,onSecondary}) {
  return <div className="pageContent centeredEmpty"><section className="glassCard largeEmptyCard"><div className="emptyState"><div className="emptyIcon">{icon}</div><h2>{title}</h2><p>{description}</p><div className="buttonRow"><button className="primaryButton" onClick={onPrimary}>{primary}</button><button className="secondaryButton" onClick={onSecondary}>{secondary}</button></div></div></section></div>;
}

function EmptyInline({text}) {
  return <div className="emptyInline">{text}</div>;
}

function ReviewTable({reviews,onOpen,onCompare}) {
  if (!reviews.length) return <EmptyInline text="No review records found." />;
  return <div className="tableScroll"><table className="dataTable"><thead><tr><th>Report</th><th>Category</th><th>Version</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>
    {reviews.map(r => <tr key={r.id}>
      <td><strong>{r.original_filename}</strong><small>{String(r.id).slice(0,8)}</small></td>
      <td>{typeLabel(r.report_type)}</td><td>V{r.version_no}</td>
      <td><span className={`statusBadge ${r.status === 'FAILED' ? 'failedBadge' : r.status === 'PASSED_INITIAL_REVIEW' ? 'passedBadge' : 'pendingBadge'}`}>{statusLabel(r.status)}</span></td>
      <td>{formatDate(r.created_at)}</td>
      <td><button className="tableAction" onClick={() => onOpen(r.id)}>View</button>{r.parent_review_id && <button className="tableAction" onClick={() => onCompare(r)}>Compare</button>}</td>
    </tr>)}
  </tbody></table></div>;
}

function ResultView({result}) {
  const data = result.result || result;
  const sop = data.sop_findings || [];
  const template = data.template_findings || [];
  const total = sop.length + template.length;
  return <div className="pageContent resultContent">
    <div className="pageIntro"><div><div className="dateEyebrow">AI REVIEW SUMMARY</div><h1>Review Result</h1><p>{data.reportName || 'Operational report'} · {typeLabel(data.reportType)}</p></div><span className="statusBadge pendingBadge">Needs human verification</span></div>
    <section className="glassCard resultSummary">
      <div className="resultSummaryIcon">✓</div><div><div className="sectionEyebrow">REVIEW STATUS</div><h2>{statusLabel(data.status)}</h2><p>{data.summary || 'The AI review is complete. Verify every finding and evidence before making a decision.'}</p></div>
      <div className="summaryNumbers"><div><strong>{total}</strong><span>Total findings</span></div><div><strong>{sop.length}</strong><span>SOP</span></div><div><strong>{template.length}</strong><span>Template</span></div></div>
    </section>
    <div className="resultColumns">
      <section className="glassCard findingsPanel"><div className="panelHeading"><div><div className="sectionEyebrow">01 / SOP COMPLIANCE</div><h2>SOP Findings</h2></div><span className="countPill">{sop.length} items</span></div><FindingList findings={sop}/></section>
      <section className="glassCard findingsPanel"><div className="panelHeading"><div><div className="sectionEyebrow">02 / TEMPLATE CHECK</div><h2>Template Findings</h2></div><span className="countPill">{template.length} items</span></div><FindingList findings={template}/></section>
    </div>
    <div className="humanNotice"><strong>Human-in-the-loop safeguard</strong><span>This result is a first-pass review, not an approval or audit opinion. A human reviewer must verify the evidence and determine the next action.</span></div>
  </div>;
}

function FindingList({findings}) {
  if (!findings.length) return <EmptyInline text="No findings were returned for this section." />;
  return findings.map((f,i) => <div className="findingItem" key={i}>
    <div className="findingHeader"><strong>{f.requirement || 'Requirement'}</strong><span className={`severityBadge ${String(f.severity).toLowerCase()}`}>{f.severity || 'Informasi'}</span></div>
    <div className="findingStatus">{f.status || 'Needs review'} {f.needs_human_review && <span>· Needs human review</span>}</div>
    <div className="evidenceBox"><small>EVIDENCE TRAIL</small><blockquote>{f.evidence_quote || 'No evidence quote found in the report.'}</blockquote><span className="evidenceValidation">{f.evidence_validation || 'Evidence not available'}</span></div>
    <p>{f.explanation}</p><div className="recommendation"><b>Recommendation</b><span>{f.recommendation}</span></div>
  </div>);
}

function FindingsView({result}) {
  const data = result.result || result;
  const sop = data.sop_findings || [];
  const template = data.template_findings || [];
  return <div className="pageContent">
    <div className="pageIntro"><div><div className="dateEyebrow">TRACEABLE AI OUTPUT</div><h1>Findings & Evidence</h1><p>Evidence quotes and recommendations extracted from the selected review.</p></div><span className="statusBadge pendingBadge">Human verification required</span></div>
    <div className="resultColumns">
      <section className="glassCard findingsPanel"><div className="panelHeading"><div><div className="sectionEyebrow">01 / SOP COMPLIANCE</div><h2>SOP Evidence</h2></div><span className="countPill">{sop.length} items</span></div><FindingList findings={sop}/></section>
      <section className="glassCard findingsPanel"><div className="panelHeading"><div><div className="sectionEyebrow">02 / TEMPLATE CHECK</div><h2>Template Evidence</h2></div><span className="countPill">{template.length} items</span></div><FindingList findings={template}/></section>
    </div>
    <div className="humanNotice"><strong>Evidence safeguard</strong><span>Evidence quotes are checked against the extracted report text. Missing evidence means the information was not located in the document, not proof that an action never occurred.</span></div>
  </div>;
}

function ComparisonView({comparison}) {
  const versions = [...(comparison.versions || [])].sort((a,b) => a.version_no - b.version_no);
  if (versions.length < 2) return <div className="pageContent"><section className="glassCard"><EmptyInline text="Two review versions are required for comparison."/></section></div>;
  const [oldV,newV] = versions;
  const flatten = v => {
    const r = v.results || {};
    return [...(r.sop_findings || []).map(f => ({...f,source:'SOP'})), ...(r.template_findings || []).map(f => ({...f,source:'Template'}))];
  };
  const oldRows = flatten(oldV), newRows = flatten(newV);
  const key = f => `${f.source}::${f.requirement}`;
  const oldMap = new Map(oldRows.map(f => [key(f),f]));
  const newMap = new Map(newRows.map(f => [key(f),f]));
  const keys = [...new Set([...oldMap.keys(),...newMap.keys()])];
  const changes = keys.filter(k => oldMap.get(k)?.status !== newMap.get(k)?.status).length;
  return <div className="pageContent">
    <div className="pageIntro"><div><div className="dateEyebrow">RECHECK & VERSION CONTROL</div><h1>Version Comparison</h1><p>Compare the findings before and after the report revision.</p></div><span className="statusBadge pendingBadge">Human verification required</span></div>
    <div className="comparisonStats"><MiniStat label={`Previous · V${oldV.version_no}`} value={oldRows.length}/><MiniStat label={`Revised · V${newV.version_no}`} value={newRows.length}/><MiniStat label="Changed statuses" value={changes}/></div>
    <section className="glassCard tableCard"><h2>Finding changes</h2><div className="tableScroll"><table className="dataTable"><thead><tr><th>Requirement</th><th>Source</th><th>Previous status</th><th>Revised status</th><th>Change</th></tr></thead><tbody>{keys.map(k => {
      const a = oldMap.get(k), b = newMap.get(k), changed = a?.status !== b?.status;
      return <tr key={k}><td><strong>{b?.requirement || a?.requirement}</strong></td><td>{b?.source || a?.source}</td><td>{a?.status || 'Not found'}</td><td>{b?.status || 'Not found'}</td><td><span className={`statusBadge ${changed ? 'activeBadge' : 'archivedBadge'}`}>{changed ? 'Changed' : 'Unchanged'}</span></td></tr>;
    })}</tbody></table></div></section>
  </div>;
}

function ReferenceUpload({reportType,setReportType,onUploaded,setNotice,setError,busy,setBusy}) {
  const [kind,setKind] = useState('sop');
  const [file,setFile] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    if (!file) return setError('Choose a reference file first.');
    const form = new FormData();
    form.append('file',file);
    form.append('reportType',reportType);
    form.append('documentKind',kind);
    setBusy(true);
    try {
      const data = await api('/api/references',{method:'POST',body:form});
      setNotice(`${data.item.original_filename} saved as version ${data.item.version_no} and set as active.`);
      setFile(null);
      e.target.reset();
      await onUploaded();
    } catch(err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="glassCard referenceUpload">
    <div className="sectionEyebrow">REFERENCE ADMINISTRATION</div><h2>Add reference document</h2><p>Upload each SOP and template once. New versions are archived automatically.</p>
    <form onSubmit={submit}>
      <label>Report category</label><select className="selectField" value={reportType} onChange={e=>setReportType(e.target.value)}>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select>
      <label>Reference type</label><div className="segmented">{[['sop','SOP Document'],['template','Report Template']].map(([v,l])=><button type="button" key={v} className={kind===v?'segmentSelected':''} onClick={()=>setKind(v)}>{l}</button>)}</div>
      <label>Choose file</label><label className="smallDropzone"><input type="file" accept=".pdf,.docx" onChange={e=>setFile(e.target.files?.[0]||null)}/><span className="uploadSymbol">⇧</span><strong>{file?file.name:'Drag and drop reference file'}</strong><span>or browse files · PDF or DOCX</span></label>
      <button className="primaryButton fullWidth" disabled={busy || !file}>{busy?'Saving...':'Save reference document →'}</button>
    </form>
  </section>;
}
