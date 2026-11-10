# DocuGuard AI — MVP Starter

DocuGuard AI adalah first-pass reviewer untuk laporan Penjualan, Anggaran, dan Insiden.
Arsitektur ini memakai **Master Document Repository**: SOP dan Template diunggah satu kali,
disimpan sebagai versi aktif, lalu dipakai berulang kali. Pada proses review biasa, pengguna
hanya mengunggah laporan.

## UI/UX

Frontend mengikuti screenshot desain DocuGuard AI yang diberikan: sidebar forest-green, latar glassmorphism hijau muda, kartu rounded, dashboard queue/roadmap, dan navigasi Dashboard, New Review, AI Processing, Review Result, Findings & Evidence, Human Review, History, Version Comparison, serta Reference Library. New Review hanya meminta satu file laporan; SOP dan Template aktif diambil otomatis dari Reference Library.

## Fitur dalam starter ini

- Master Reference Library untuk SOP dan Template per jenis laporan.
- Versioning dokumen referensi; satu SOP aktif dan satu Template aktif per jenis laporan.
- Upload laporan PDF/DOCX.
- Ekstraksi teks PDF/DOCX berbasis teks (belum OCR untuk dokumen hasil scan).
- n8n mengorkestrasi dua analisis terpisah: kepatuhan SOP dan kelengkapan Template.
- Validasi evidence quote terhadap teks laporan.
- Kategori temuan: Informasi, Minor, Mayor, Kritis.
- Human review untuk temuan ambigu atau evidence yang tidak dapat diverifikasi.
- Riwayat review dan recheck berbasis parent review.
- PostgreSQL menyimpan referensi, hasil review, versi, dan audit event.

## Catatan penting

1. Starter ini adalah fondasi MVP yang harus diuji dengan dokumen nyata sebelum demo.
2. Tidak ada automatic approval. Status akhir hanya `READY_FOR_HUMAN_REVIEW` atau
   `NEEDS_HUMAN_REVIEW`.
3. File PDF hasil scan tanpa lapisan teks akan ditolak dengan pesan bahwa OCR belum tersedia.
4. Workflow n8n menggunakan OpenAI Chat Completions melalui HTTP Request. Anda harus
   mengatur `OPENAI_API_KEY` pada container n8n.
5. Setelah import workflow, buat credential PostgreSQL di n8n bernama
   `DocuGuard PostgreSQL` dan pilih credential itu pada node Postgres.
6. UI di starter ini menggunakan gaya navy-violet enterprise berdasarkan arah visual
   dokumen produk yang disertakan. Tautan Figma Make yang diberikan tidak dapat dibaca
   dari sesi ini, sehingga pencocokan pixel-perfect belum dapat dijamin. Untuk itu diperlukan
   screenshot/export frame Figma atau akses file yang dapat dibaca.

## Jalankan dengan Docker

```bash
cp .env.example .env
# Isi OPENAI_API_KEY dan N8N_ENCRYPTION_KEY di .env
docker compose up --build
```

Akses:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/health
- n8n: http://localhost:5678

Login n8n perlu dikonfigurasi sesuai kebijakan deployment Anda. Jangan expose n8n ke publik
tanpa autentikasi, HTTPS, dan pembatasan akses.

## Setup workflow n8n

1. Buka n8n.
2. Import `workflows/docuguard-review.json`.
3. Buat credential PostgreSQL:
   - Host: `postgres`
   - Database: `docuguard`
   - User/password: nilai `POSTGRES_USER` / `POSTGRES_PASSWORD` dari `.env`
   - Port: `5432`
4. Pilih credential tersebut pada node `Write Audit Event`.
5. Pastikan environment n8n memiliki `OPENAI_API_KEY`.
6. Aktifkan workflow.
7. Pastikan `N8N_REVIEW_WEBHOOK_URL=http://n8n:5678/webhook/docuguard-review`
   pada backend.

## Master Reference Library

Upload dua jenis dokumen untuk setiap report type:
- `sop`
- `template`

Report type yang didukung:
- `sales`
- `budget`
- `incident`

Contoh:
- SOP Insiden v1, Template Insiden v1
- SOP Anggaran v1, Template Anggaran v1
- SOP Penjualan v1, Template Penjualan v1

Setiap upload baru untuk pasangan report type + document kind akan mengarsipkan versi aktif
sebelumnya dan menjadikan versi baru sebagai aktif. Review lama tetap menyimpan snapshot
nomor versi referensi yang digunakan saat review dilakukan.

## API ringkas

- `GET /api/references?reportType=incident`
- `POST /api/references` multipart: `file`, `reportType`, `documentKind`
- `POST /api/reviews` multipart: `file`, `reportType`, optional `parentReviewId`
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `GET /api/reviews/:id/compare/:otherId`

## Recheck

Untuk melakukan recheck, unggah revisi melalui `POST /api/reviews` dan sertakan
`parentReviewId` dari review sebelumnya. Sistem akan membuat versi review baru dan
menghubungkannya dengan review induk.

## Batasan MVP yang disengaja

- PDF/DOCX berbasis teks; OCR belum diaktifkan.
- Belum ada autentikasi/role-based access control. Tambahkan sebelum dipakai untuk data
  perusahaan yang sensitif.
- Penyimpanan file menggunakan volume lokal Docker. Untuk produksi, ganti adapter storage
  dengan S3-compatible storage seperti MinIO atau object storage perusahaan.
- Model AI dapat salah. Evidence quote divalidasi secara deterministik, tetapi keputusan
  kepatuhan akhir tetap harus dilakukan reviewer manusia.
