# Integrasi frontend Figma DocuGuard → backend → n8n Gemini

Frontend ini sudah dipasang adapter API untuk tiga unggahan nyata (SOP, template, laporan). Backend menyimpan referensi dan mengirim laporan ke workflow Gemini. Hasil `frontend_review` ditampilkan pada layar hasil, dan riwayat 30 terbaru dimuat dari PostgreSQL.

## Prasyarat
Backend lama tetap berjalan pada http://localhost:4000 dan workflow n8n aktif pada http://localhost:5679. Pada `.env` backend lama gunakan `N8N_REVIEW_WEBHOOK_URL=http://n8n:5678/webhook/docuguard-figma-gemini-review`, kemudian recreate backend.

## Jalankan
Di PowerShell:
```powershell
cd "D:\DocuguardAI"
npm install
npm run dev -- --host 0.0.0.0 --port 3001
```
Buka http://localhost:3001. Proxy Vite meneruskan `/api` ke `http://localhost:4000`, tidak diperlukan CORS tambahan.

## Uji
1. Cek http://localhost:4000/health.
2. Pilih SOP, Template, Laporan asli (PDF/DOCX berbasis teks). Centang konfirmasi.
3. Klik Mulai Tinjauan AI; frontend upload referensi lalu submit laporan ke backend. Workflow n8n harus aktif.
4. Setelah selesai, hasil n8n `frontend_review` muncul pada Review Result dan Findings & Evidence.
5. Riwayat review dari PostgreSQL dimuat saat frontend dibuka.

## Batasan penting
- Backend versi sekarang hanya menerima reportType `sales`, `budget`, `incident`; adapter ini memakai `incident` agar kompatibel. Perlu pembaruan skema/backend agar mendukung kategori `general` asli.
- Tombol revisi V2 berbasis teks demo dinonaktifkan dan perlu workflow recheck unggah file nyata.
- Keputusan Human Review disimpan lokal dalam UI, **belum ditulis ke backend**; jangan dianggap persetujuan resmi.
- Indikator tahapan bersifat ringkasan proses, bukan progres node n8n real-time.
- Hasil mencerminkan kriteria yang dikembalikan Gemini, bukan audit 100% terhadap seluruh klausul SOP.
- Data sensitif, token, dan API key tidak boleh diletakkan dalam frontend.
