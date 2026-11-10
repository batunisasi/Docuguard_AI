const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { pool } = require('./db');
const { extractText } = require('./extract');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024;
const N8N_URL = process.env.N8N_REVIEW_WEBHOOK_URL;

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',') }));
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) return cb(new Error('Format tidak didukung. Gunakan PDF atau DOCX.'));
    cb(null, true);
  }
});

const validType = (v) => ['sales', 'budget', 'incident'].includes(v);
const validKind = (v) => ['sop', 'template'].includes(v);

async function persistFile(file, prefix) {
  const dir = path.join(STORAGE_DIR, prefix);
  await fs.mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
  const fullPath = path.join(dir, safeName);
  await fs.writeFile(fullPath, file.buffer);
  return fullPath;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'docuguard-api' }));

app.get('/api/references', async (req, res, next) => {
  try {
    const { reportType } = req.query;
    const params = [];
    let where = '';
    if (reportType) {
      if (!validType(reportType)) return res.status(400).json({ error: 'Jenis laporan tidak valid.' });
      params.push(reportType);
      where = 'WHERE report_type = $1';
    }
    const q = await pool.query(
      `SELECT id, report_type, document_kind, version_no, original_filename, size_bytes, sha256, is_active, uploaded_at
       FROM docuguard.reference_documents ${where}
       ORDER BY report_type, document_kind, version_no DESC`, params
    );
    res.json({ items: q.rows });
  } catch (e) { next(e); }
});

app.post('/api/references', upload.single('file'), async (req, res, next) => {
  const client = await pool.connect();
  let storedPath;
  try {
    const { reportType, documentKind } = req.body;
    if (!validType(reportType) || !validKind(documentKind)) {
      return res.status(400).json({ error: 'Pilih jenis laporan dan jenis referensi yang valid.' });
    }
    if (!req.file) return res.status(400).json({ error: 'File referensi wajib diunggah.' });
    const extracted = await extractText(req.file.buffer, req.file.originalname, req.file.mimetype);
    storedPath = await persistFile(req.file, 'references');
    await client.query('BEGIN');
    const v = await client.query(
      `SELECT COALESCE(MAX(version_no),0)+1 AS next_version
       FROM docuguard.reference_documents WHERE report_type=$1 AND document_kind=$2`,
      [reportType, documentKind]
    );
    const versionNo = Number(v.rows[0].next_version);
    await client.query(
      `UPDATE docuguard.reference_documents SET is_active=FALSE
       WHERE report_type=$1 AND document_kind=$2 AND is_active=TRUE`,
      [reportType, documentKind]
    );
    const id = randomUUID();
    const inserted = await client.query(
      `INSERT INTO docuguard.reference_documents
       (id, report_type, document_kind, version_no, original_filename, mime_type, size_bytes, storage_path, extracted_text, sha256, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)
       RETURNING id, report_type, document_kind, version_no, original_filename, is_active, uploaded_at`,
      [id, reportType, documentKind, versionNo, req.file.originalname, req.file.mimetype, req.file.size, storedPath, extracted, sha256(req.file.buffer)]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: 'Dokumen referensi berhasil disimpan dan diaktifkan.', item: inserted.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (storedPath) await fs.unlink(storedPath).catch(() => {});
    next(e);
  } finally { client.release(); }
});

app.post('/api/reviews', upload.single('file'), async (req, res, next) => {
  let storedPath;
  try {
    const { reportType, parentReviewId } = req.body;
    if (!validType(reportType)) return res.status(400).json({ error: 'Jenis laporan tidak valid.' });
    if (!req.file) return res.status(400).json({ error: 'Silakan unggah dokumen laporan.' });
    if (!N8N_URL) return res.status(503).json({ error: 'Webhook n8n belum dikonfigurasi.' });

    const reportText = await extractText(req.file.buffer, req.file.originalname, req.file.mimetype);
    const refs = await pool.query(
      `SELECT id, report_type, document_kind, version_no, original_filename, extracted_text
       FROM docuguard.reference_documents
       WHERE report_type=$1 AND is_active=TRUE`,
      [reportType]
    );
    const sop = refs.rows.find(r => r.document_kind === 'sop');
    const template = refs.rows.find(r => r.document_kind === 'template');
    if (!sop || !template) {
      return res.status(409).json({
        error: 'Master referensi belum lengkap.',
        detail: `Sebelum review, admin harus menyimpan SOP dan Template aktif untuk jenis laporan ${reportType}.`,
        missing: [!sop ? 'SOP' : null, !template ? 'Template' : null].filter(Boolean)
      });
    }

    storedPath = await persistFile(req.file, 'reports');
    const client = await pool.connect();
    let review;
    try {
      await client.query('BEGIN');
      let versionNo = 1;
      if (parentReviewId) {
        const parent = await client.query('SELECT id, report_type FROM docuguard.reviews WHERE id=$1', [parentReviewId]);
        if (!parent.rowCount) throw Object.assign(new Error('Review induk tidak ditemukan.'), { status: 404 });
        if (parent.rows[0].report_type !== reportType) throw Object.assign(new Error('Jenis laporan revisi harus sama dengan review induk.'), { status: 400 });
        const v = await client.query(
          `WITH RECURSIVE review_family AS (
             SELECT id, parent_review_id, version_no
             FROM docuguard.reviews WHERE id=$1
             UNION ALL
             SELECT child.id, child.parent_review_id, child.version_no
             FROM docuguard.reviews child
             JOIN review_family parent ON child.parent_review_id = parent.id
           )
           SELECT COALESCE(MAX(version_no),0)+1 AS v FROM review_family`,
          [parentReviewId]
        );
        versionNo = Number(v.rows[0].v);
      }
      const id = randomUUID();
      const snapshot = {
        sop: { id: sop.id, version: sop.version_no, filename: sop.original_filename },
        template: { id: template.id, version: template.version_no, filename: template.original_filename }
      };
      const result = await client.query(
        `INSERT INTO docuguard.reviews
         (id,parent_review_id,report_type,version_no,original_filename,mime_type,size_bytes,storage_path,extracted_text,reference_snapshot,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,'PROCESSING')
         RETURNING id,parent_review_id,report_type,version_no,original_filename,status,created_at,reference_snapshot`,
        [id, parentReviewId || null, reportType, versionNo, req.file.originalname, req.file.mimetype, req.file.size, storedPath, reportText, JSON.stringify(snapshot)]
      );
      review = result.rows[0];
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }

    const payload = {
      reviewId: review.id,
      reportType,
      reportName: req.file.originalname,
      reportText,
      sopText: sop.extracted_text,
      templateText: template.extracted_text,
      referenceSnapshot: review.reference_snapshot
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const n8nResponse = await fetch(N8N_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const bodyText = await n8nResponse.text();
      let result;
      try { result = JSON.parse(bodyText); } catch { result = { raw: bodyText }; }
      if (!n8nResponse.ok) throw new Error(result.error || `n8n mengembalikan HTTP ${n8nResponse.status}`);
      const finalResult = result.result || result;
      await pool.query(
        `UPDATE docuguard.reviews SET status=$2, results=$3::jsonb, human_review_required=$4, completed_at=NOW() WHERE id=$1`,
        [review.id, finalResult.status || 'READY_FOR_HUMAN_REVIEW', JSON.stringify(finalResult), Boolean(finalResult.human_review_required)]
      );
      await pool.query(
        `INSERT INTO docuguard.review_events(review_id,event_type,payload) VALUES($1,'REVIEW_COMPLETED',$2::jsonb)`,
        [review.id, JSON.stringify({ status: finalResult.status, reportType, versionNo: review.version_no })]
      );
      res.status(201).json({ reviewId: review.id, review: finalResult, versionNo: review.version_no });
    } catch (e) {
      await pool.query(`UPDATE docuguard.reviews SET status='FAILED', completed_at=NOW() WHERE id=$1`, [review.id]);
      throw e;
    } finally { clearTimeout(timeout); }
  } catch (e) {
    if (storedPath && e.status) await fs.unlink(storedPath).catch(() => {});
    next(e);
  }
});

app.get('/api/reviews', async (_req, res, next) => {
  try {
    const q = await pool.query(
      `SELECT id,parent_review_id,report_type,version_no,original_filename,status,human_review_required,created_at,completed_at
       FROM docuguard.reviews ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ items: q.rows });
  } catch (e) { next(e); }
});

app.get('/api/reviews/:id', async (req, res, next) => {
  try {
    const q = await pool.query('SELECT * FROM docuguard.reviews WHERE id=$1', [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ error: 'Review tidak ditemukan.' });
    res.json({ item: q.rows[0] });
  } catch (e) { next(e); }
});

app.get('/api/reviews/:id/compare/:otherId', async (req, res, next) => {
  try {
    const q = await pool.query(
      `SELECT id,parent_review_id,version_no,results,status,created_at
       FROM docuguard.reviews WHERE id = ANY($1::uuid[]) ORDER BY version_no`,
      [[req.params.id, req.params.otherId]]
    );
    if (q.rowCount !== 2) return res.status(404).json({ error: 'Kedua review harus tersedia untuk dibandingkan.' });
    res.json({ versions: q.rows });
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({
    error: err.message || 'Terjadi kesalahan pada server.',
    action: status === 413 ? 'Kurangi ukuran file dan coba kembali.' : 'Periksa format file, koneksi, dan konfigurasi sistem.'
  });
});

fs.mkdir(STORAGE_DIR, { recursive: true }).then(() => {
  app.listen(PORT, () => console.log(`DocuGuard API listening on ${PORT}`));
});
