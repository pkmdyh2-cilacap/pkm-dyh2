# PANDUAN APLIKASI PKM Dyah2

Aplikasi monitoring mutu Puskesmas untuk pencatatan capaian indikator, upload dokumen, dan dashboard evaluasi per klaster.

---

## 1. Pendahuluan

**PKM Dyah2** adalah aplikasi berbasis web untuk manajemen data mutu Puskesmas. Aplikasi ini memungkinkan:

- Pencatatan data capaian indikator mutu per unit pelayanan
- Upload & download dokumen pralokmin (undangan, notulen, daftar hadir, lampiran)
- Dashboard ringkasan capaian per klaster
- Kelola indikator, unit pelayanan, dan target

### Teknologi

| Layer | Teknologi |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Supabase) |
| Storage | Supabase Storage (bucket `pralokmin-files`) |
| Frontend | HTML + Tailwind CSS (CDN) + Font Awesome |
| Deployment | Vercel (serverless) |

### Konsep Domain

- **Klaster** — 5 kelompok pelayanan (Klaster 1–5)
- **Unit** — Unit pelayanan (misal: UGD, Rawat Inap, Poli Umum)
- **Indikator** — Indikator mutu dengan target tahunan & mode bulanan
- **Entries** — Data capaian aktual per indikator per bulan
- **Pralokmin** — Dokumen pendukung per bulan per klaster (4 jenis)

---

## 2. Persyaratan Sistem

- **Node.js** 18.x LTS atau lebih baru
- **npm** 9+
- **Akun Supabase** (gratis di https://supabase.com)
- **(Opsional)** Akun Vercel untuk deployment

---

## 3. Instalasi & Setup

### 3.1 Clone & Install

```bash
git clone <repo-url>
cd pkm-dyh2
npm install
```

> Test dependencies (`jest`, `supertest`, `@stryker-mutator/core`) otomatis terinstal. Lihat [TEST.md](./TEST.md) untuk panduan testing lengkap.

### 3.2 Konfigurasi Environment

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Isi dengan kredensial Supabase kamu:

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `SUPABASE_URL` | URL project Supabase | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon/public key (bisa expose) | `sb_publishable_...` |
| `SUPABASE_SERVICE_KEY` | Service role key (rahasia!) | `eyJhbGci...` |
| `CORS_ORIGIN` | Domain yang diizinkan (pisah koma) | `http://localhost:3000,http://localhost:5173` |
| `PORT` | Port server lokal | `3000` |

> **Peringatan**: Jangan pernah commit `.env` ke git. File `.env` sudah ada di `.gitignore`.

### 3.3 Migrasi Database

1. Buka Supabase Dashboard → SQL Editor
2. Copy paste isi `sql/migration.sql`
3. Jalankan — akan membuat 4 tabel + RLS policies

### 3.4 Setup Storage

1. Supabase Dashboard → Storage
2. Buat bucket baru dengan nama **`pralokmin-files`**
3. Set public bucket (atau atur RLS sesuai kebutuhan)

### 3.5 Jalankan

```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

Akses di `http://localhost:3000`

---

## 4. Struktur Project

```
pkm-dyh2/
│
├── server.js                 # Entry point (start server)
├── package.json              # Dependencies & scripts
├── vercel.json               # Konfigurasi deploy Vercel
├── PLAN.md                   # Daftar bug & rencana perbaikan
├── PANDUAN.md                # Dokumentasi ini
├── TEST.md                   # Panduan testing
│
├── __tests__/                # Test files (jest + supertest)
│   ├── setup.js              # Mock Supabase & env vars
│   ├── app.test.js           # Integration tests
│   ├── app.additional.test.js# Additional integration tests
│   ├── routes/
│   │   ├── units.test.js
│   │   ├── indicators.test.js
│   │   ├── entries.test.js
│   │   ├── dashboard.test.js
│   │   ├── upload.test.js
│   │   └── files.test.js
│   └── helpers/
│       └── supabase-mock.js
│
├── .env                      # Environment variables (TIDAK di-git)
├── .env.example              # Template env
├── .gitignore
│
├── api/
│   └── index.js              # Entry point serverless Vercel
│
├── src/
│   ├── app.js                # Express app: middleware, routes, error handler
│   │
│   ├── config/
│   │   └── supabase.js       # Client Supabase (anon + service_role)
│   │
│   └── routes/
│       ├── upload.js         # POST /api/upload
│       ├── files.js          # File status, detail, download, delete
│       ├── units.js          # CRUD units
│       ├── indicators.js     # CRUD indicators
│       ├── entries.js        # CRUD entries
│       └── dashboard.js      # GET /api/dashboard
│
├── sql/
│   └── migration.sql         # Schema database lengkap
│
├── public/                   # Frontend statis (14 file HTML)
│   ├── index.html
│   ├── dashboard-pkp.html
│   ├── pralokmin.html
│   ├── pralokmin-klaster.html
│   ├── kelola-indikator.html
│   ├── entri-pkp1.html  s.d.  entri-pkp5.html
│   ├── yanlik.html
│   ├── mutu.html
│   ├── favicon.png
│   └── logo.png
│
└── node_modules/             # Dependencies (tidak di-git)
```

---

## 5. Database Schema

### 5.1 Entity Relationship

```
units ──┐
         │
indicators ──┐
              │
entries ──────┤ (indikator_id → indicators.id)
              │
pralokmin_files (tidak ada foreign key — standalone)
```

### 5.2 Tabel: `units`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `BIGINT PK` (auto increment) | |
| `klaster` | `BIGINT` (default 5) | |
| `nama` | `TEXT` | Nama unit pelayanan |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` |

### 5.3 Tabel: `indicators`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `BIGINT PK` (auto increment) | |
| `klaster` | `BIGINT` (default 5) | |
| `unit` | `TEXT` | Nama unit (ref ke units.nama) |
| `nama` | `TEXT` | Nama indikator |
| `target` | `TEXT` | Target tahunan (bisa teks) |
| `satuan` | `TEXT` (default `'persen'`) | `persen` atau `teks` |
| `mode_bulanan` | `TEXT` (default `'bagi12'`) | Cara hitung target bulanan |
| `bor` | `BOOLEAN` (default `FALSE`) | Apakah indikator BOR |

### 5.4 Tabel: `entries`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `BIGINT PK` (auto increment) | |
| `klaster` | `BIGINT` (default 5) | |
| `indikator_id` | `BIGINT NOT NULL` | |
| `petugas` | `TEXT NOT NULL` | Unit petugas |
| `unit` | `TEXT NOT NULL` | Sama dengan petugas |
| `bulan` | `TEXT NOT NULL` | `'01'` - `'12'` |
| `tahun` | `TEXT NOT NULL` | `'2024'` |
| `periode` | `TEXT NOT NULL` | `'Januari 2024'` |
| `indikator_nama` | `TEXT NOT NULL` | Denormalisasi |
| `target_tahunan` | `TEXT` | |
| `mode_bulanan` | `TEXT` (default `'bagi12'`) | |
| `target_bulanan` | `DOUBLE PRECISION` | |
| `aktual` | `TEXT` (bisa teks/number) | |
| `satuan` | `TEXT` (default `'persen'`) | |
| `status_capaian` | `TEXT` | `'Mencapai Target'` / `'Belum Mencapai Target'` |
| `analisa` | `TEXT` | |
| `rtl` | `TEXT` | Rencana Tindak Lanjut |
| `bor` | `BOOLEAN` (default `FALSE`) | |
| `bor_hari_rawat` | `DOUBLE PRECISION` | |
| `bor_tt` | `DOUBLE PRECISION` | |
| `bor_hari_periode` | `DOUBLE PRECISION` | |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` |

### 5.5 Tabel: `pralokmin_files`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `BIGINT PK` (auto increment) | |
| `bulan` | `TEXT NOT NULL` | `'2024-01'` |
| `klaster` | `BIGINT NOT NULL` | 1–5 |
| `jenis` | `TEXT NOT NULL` | `'undangan'`, `'notulen'`, `'daftar_hadir'`, `'lampiran'` |
| `nama_file` | `TEXT NOT NULL` | Nama asli file |
| `storage_path` | `TEXT NOT NULL` | Path di Supabase Storage |
| `ukuran` | `BIGINT` (default 0) | Ukuran dalam bytes |
| `diupload_pada` | `TIMESTAMPTZ` | Default `NOW()` |
| | **UNIQUE** | `(bulan, klaster, jenis)` |

### 5.6 Row Level Security (RLS)

Semua tabel mengaktifkan RLS dengan policy `FOR ALL USING (true)` — akses publik penuh.

---

## 6. Frontend Pages (Ikhtisar Fitur)

| Halaman | Fungsi | API yang Dipanggil |
|---------|--------|-------------------|
| `index.html` | Landing page, navigasi menu | — |
| `pralokmin.html` | Upload file PDF per bulan/klaster | `POST /api/upload` |
| `pralokmin-klaster.html` | Lihat status, detail, download & hapus file per klaster | `GET /api/status/:bulan`, `GET /api/files/:bulan/:klaster`, `DELETE /api/files/:bulan/:klaster`, `GET /api/download/:bulan`, `GET /api/download-klaster/:bulan/:klaster` |
| `kelola-indikator.html` | CRUD unit pelayanan & indikator | `GET /api/units`, `POST /api/units`, `DELETE /api/units/:id`, `GET /api/indicators`, `POST /api/indicators`, `PUT /api/indicators/:id`, `DELETE /api/indicators/:id` |
| `entri-pkp1.html` s.d. `entri-pkp5.html` | Entry data capaian per klaster (1–5) | `GET /api/units?klaster=N`, `GET /api/indicators?klaster=N`, `GET /api/entries?klaster=N`, `POST /api/entries?klaster=N`, `PUT /api/entries/:id`, `DELETE /api/entries/:id` |
| `dashboard-pkp.html` | Dashboard capaian semua klaster | `GET /api/entries` |
| `yanlik.html` | Tampilan data per unit pelayanan | — (statis/sidebar) |
| `mutu.html` | Tampilan data mutu | — (statis/sidebar) |

---

## 7. API Endpoints

### 7.1 Upload

| Method | Endpoint | Parameter | Response | Deskripsi |
|--------|----------|-----------|----------|-----------|
| `POST` | `/api/upload` | `multipart/form-data`: `bulan`, `klaster`, `undangan`, `notulen`, `daftar_hadir`, `lampiran` | `{ success, message }` | Upload file PDF (max 10 MB per file) |

### 7.2 Files

| Method | Endpoint | Parameter | Response | Deskripsi |
|--------|----------|-----------|----------|-----------|
| `GET` | `/api/status/:bulan` | `:bulan` (e.g. `2024-01`) | `{ klaster: { jenis: bool } }` | Status kelengkapan file per klaster |
| `GET` | `/api/files/:bulan/:klaster` | `:bulan`, `:klaster` | `[{ jenis, nama_file, storage_path, ukuran, diupload_pada }]` | Detail file per klaster |
| `DELETE` | `/api/file/:bulan/:klaster/:jenis` | `:bulan`, `:klaster`, `:jenis` | `{ success, message }` | Hapus 1 file spesifik |
| `DELETE` | `/api/files/:bulan/:klaster` | `:bulan`, `:klaster` | `{ success, message }` | Hapus semua file di klaster |
| `GET` | `/api/download/:bulan` | `:bulan` | ZIP binary | Download ZIP semua file per bulan |
| `GET` | `/api/download-klaster/:bulan/:klaster` | `:bulan`, `:klaster` | ZIP binary | Download ZIP file per klaster |

### 7.3 Units

| Method | Endpoint | Parameter | Response | Deskripsi |
|--------|----------|-----------|----------|-----------|
| `GET` | `/api/units` | `?klaster=N` | `[{ id, klaster, nama, created_at }]` | Daftar unit |
| `POST` | `/api/units` | `?klaster=N`, body: `{ nama }` | `{ id, message }` | Tambah unit |
| `DELETE` | `/api/units/:id` | `:id` | `{ message }` | Hapus unit |

### 7.4 Indicators

| Method | Endpoint | Parameter | Response | Deskripsi |
|--------|----------|-----------|----------|-----------|
| `GET` | `/api/indicators` | `?klaster=N` | `[{ id, klaster, unit, nama, target, satuan, mode_bulanan, bor }]` | Daftar indikator |
| `POST` | `/api/indicators` | `?klaster=N`, body: `{ nama, unit, target?, satuan?, modeBulanan?, bor? }` | `{ id, message }` | Tambah indikator |
| `PUT` | `/api/indicators/:id` | `:id`, body: `{ unit, nama, target, satuan, modeBulanan, bor }` | `{ message }` | Update indikator |
| `DELETE` | `/api/indicators/:id` | `:id` | `{ message }` | Hapus indikator |

### 7.5 Entries

| Method | Endpoint | Parameter | Response | Deskripsi |
|--------|----------|-----------|----------|-----------|
| `GET` | `/api/entries` | `?klaster=N` | `[{ id, klaster, indikator_id, petugas, unit, bulan, tahun, periode, ... }]` | Daftar entries |
| `POST` | `/api/entries` | `?klaster=N`, body: `{ indikatorId, petugas, bulan, tahun, periode, indikatorNama, aktual, ... }` | `{ id, message }` | Tambah entry |
| `PUT` | `/api/entries/:id` | `:id`, body: `{ ... }` | `{ message }` | Update entry |
| `DELETE` | `/api/entries/:id` | `:id` | `{ message }` | Hapus entry |

### 7.6 Dashboard

| Method | Endpoint | Parameter | Response | Deskripsi |
|--------|----------|-----------|----------|-----------|
| `GET` | `/api/dashboard` | — | `[{ klaster, total, tercapai, belum, persen }]` | Agregasi capaian per klaster |

---

## 8. Alur Aplikasi

### 8.1 Alur Request

```
                 ┌──────────────┐
                 │   Request    │
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │  CORS Check  │ ← whitelist origin
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │  CSP Header  │ ← dynamic origin
                 └──────┬───────┘
                        │
            ┌───────────▼───────────┐
            │  express.static(public) │ ← file statis
            └───────────┬───────────┘
                        │
            ┌───────────▼───────────┐
            │   Route Matching      │
            │  /api/upload          │
            │  /api                 │
            │  /api/units           │
            │  /api/indicators      │
            │  /api/entries         │
            │  /api/dashboard       │
            └───────────┬───────────┘
                        │
            ┌───────────▼───────────┐
            │  Error Handler        │ ← multer, PDF, generic
            └───────────┬───────────┘
                        │
                 ┌──────▼───────┐
                 │   Response   │
                 └──────────────┘
```

### 8.2 Alur Upload File

```
Browser (pralokmin.html)
  │
  ├─ Pilih bulan, klaster, 4 file PDF
  │
  └─ POST /api/upload (multipart/form-data)
       │
       ├─ multer: validasi type (PDF), size (10MB)
       │
       ├─ upload ke Supabase Storage bucket "pralokmin-files"
       │   Path: {bulan}/klaster{klaster}/{jenis}/{file}_{timestamp}.pdf
       │
       └─ insert/upsert metadata ke tabel pralokmin_files
            (bulan, klaster, jenis, nama_file, storage_path, ukuran)
```

### 8.3 Alur Entry Data

```
Browser (entri-pkp1.html)
  │
  ├─ Pilih unit, indikator, bulan, isi capaian → Simpan
  │
  └─ POST /api/entries?klaster=1
       │
       ├─ validasi: unit, indikator, bulan, tahun, capaian wajib
       ├─ insert ke tabel entries
       │
       └─ response { id, message }

Edit:
  PUT /api/entries/:id

Hapus:
  DELETE /api/entries/:id
```

### 8.4 Alur Download ZIP

```
Browser (pralokmin-klaster.html)
  │
  ├─ GET /api/download/:bulan  (semua klaster)
  │  └─ Backend:
  │      ├─ query pralokmin_files WHERE bulan = ?
  │      ├─ for each row: download file dari Supabase Storage
  │      ├─ kompres ke ZIP (JSZip)
  │      └─ response: application/zip
  │
  └─ GET /api/download-klaster/:bulan/:klaster  (per klaster)
     └─ (sama, diffilter per klaster)
```

---

## 9. Mapping Frontend → Backend

| Halaman Frontend | Method | Endpoint Backend | Keterangan |
|-----------------|--------|-----------------|------------|
| `pralokmin.html` | `POST` | `/api/upload` | Upload file via form |
| `pralokmin-klaster.html` | `GET` | `/api/status/:bulan` | Status file per klaster |
| `pralokmin-klaster.html` | `GET` | `/api/files/:bulan/:klaster` | Detail file |
| `pralokmin-klaster.html` | `DELETE` | `/api/files/:bulan/:klaster` | Hapus semua file klaster |
| `pralokmin-klaster.html` | `GET` | `/api/download/:bulan` | ZIP semua klaster |
| `pralokmin-klaster.html` | `GET` | `/api/download-klaster/:bulan/:klaster` | ZIP per klaster |
| `kelola-indikator.html` | `GET` | `/api/units?klaster=N` | Load unit |
| `kelola-indikator.html` | `POST` | `/api/units?klaster=N` | Tambah unit |
| `kelola-indikator.html` | `DELETE` | `/api/units/:id` | Hapus unit |
| `kelola-indikator.html` | `GET` | `/api/indicators?klaster=N` | Load indikator |
| `kelola-indikator.html` | `POST` | `/api/indicators?klaster=N` | Tambah indikator |
| `kelola-indikator.html` | `PUT` | `/api/indicators/:id` | Update indikator |
| `kelola-indikator.html` | `DELETE` | `/api/indicators/:id` | Hapus indikator |
| `entri-pkp1–5.html` | `GET` | `/api/units?klaster=N` | Load unit |
| `entri-pkp1–5.html` | `GET` | `/api/indicators?klaster=N` | Load indikator |
| `entri-pkp1–5.html` | `GET` | `/api/entries?klaster=N` | Load entries |
| `entri-pkp1–5.html` | `POST` | `/api/entries?klaster=N` | Simpan entry |
| `entri-pkp1–5.html` | `PUT` | `/api/entries/:id` | Update entry |
| `entri-pkp1–5.html` | `DELETE` | `/api/entries/:id` | Hapus entry |
| `dashboard-pkp.html` | `GET` | `/api/entries` | Load semua entries |

---

## 10. Testing

Panduan testing lengkap ada di [TEST.md](./TEST.md). Ringkasan:

### 10.1 Menjalankan Test

```bash
npm test                 # Semua test + coverage threshold
npm run test:watch       # Watch mode
npm run test:coverage    # Dengan laporan coverage
```

### 10.2 Strategi Mocking

Semua route backend menggunakan `supabaseAdmin` yang di-mock di `__tests__/setup.js`. Tidak perlu koneksi Supabase nyata — lihat [TEST.md §2](./TEST.md#2-strategi-mocking).

### 10.3 Coverage Saat Ini

- **100%** statements, branches, functions, lines (95 tests, 8 suites)
- Threshold: branches 100%, functions 96%, lines 100%, statements 99%
- Semua target coverage di [TEST.md §7](./TEST.md#7-coverage-target) **terlampaui**

### 10.4 Rekomendasi Lanjutan

Lihat [TEST.md §9](./TEST.md#9-rekomendasi-pengembangan-testing) untuk pengembangan selanjutnya:
- Mutation testing (Stryker)
- Property-based testing (fast-check)
- Edge cases & error handling (network timeout, concurrent request, boundary values, RBAC)

---

## 11. Konfigurasi

### 11.1 CORS

File: `src/app.js:11-18`

```js
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);                // request server-to-server
    const origins = (process.env.CORS_ORIGIN || '...').split(',');
    if (origins.indexOf(origin) !== -1 || CORS_ORIGIN === '*')
      return callback(null, true);                           // diizinkan
    callback(null, false);                                   // ditolak
  }
}));
```

Set `CORS_ORIGIN` di `.env` dengan daftar origin yang diizinkan, pisah koma.

### 11.2 Content Security Policy (CSP)

File: `src/app.js:24-38`

CSP di-generate secara dinamis berdasarkan `host` request. Domain Supabase untuk storage diambil dari `SUPABASE_URL`. CDN Tailwind, Font Awesome, dan `unsafe-inline` untuk script/style diizinkan.

### 11.3 Environment Variables

| Variable | Wajib | Default | Keterangan |
|----------|-------|---------|------------|
| `SUPABASE_URL` | ✅ | — | URL project Supabase |
| `SUPABASE_ANON_KEY` | ✅ | — | Anon key (public) |
| `SUPABASE_SERVICE_KEY` | ✅ | — | Service role key (rahasia!) |
| `CORS_ORIGIN` | ❌ | `http://localhost:3000,http://localhost:5173` | Origin yang diizinkan |
| `PORT` | ❌ | `3000` | Port server |

> Di Vercel, env vars di-set via Vercel Dashboard. `SUPABASE_SERVICE_KEY` sebaiknya dienkripsi.

### 11.4 Vercel Deployment

File: `vercel.json`

```json
{
  "version": 2,
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/public/$1" }
  ]
}
```

- Semua request `/api/*` diarahkan ke `api/index.js` (serverless function)
- Semua request lainnya dilayani dari folder `public/` (static files)
- `api/index.js` adalah wrapper yang memanggil `src/app.js`

---

## 12. Security Checklist

- [ ] **Jangan commit `.env`** — sudah di `.gitignore`, tapi pastikan tidak pernah di-`git add` manual
- [ ] **CORS whitelist** — pastikan `CORS_ORIGIN` hanya berisi domain yang dikenal
- [ ] **CSP dynamic origin** — sudah otomatis, URL storage diambil dari SUPABASE_URL
- [ ] **Supabase RLS** — semua tabel punya RLS aktif dengan policy publik. Untuk production, pertimbangkan policy yang lebih ketat
- [ ] **Bedakan client** — `supabase` (anon key) untuk frontend, `supabaseAdmin` (service role) untuk backend. Route backend pakai `supabaseAdmin` agar tidak terkendala RLS
- [ ] **Validasi input** — multer untuk file, express.json untuk JSON body. Error handler menangkap multer errors
- [ ] **Ukuran file** — maksimal 10 MB per file (baik frontend maupun backend)
- [ ] **Jalankan test** — `npm test` sebelum commit untuk memastikan tidak ada regression (lihat [TEST.md](./TEST.md))

---

## 13. Troubleshooting & FAQ

### "CORS error di browser"

**Penyebab**: Origin request tidak ada di whitelist `CORS_ORIGIN`.

**Solusi**: Tambahkan origin ke `.env`:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://domain-vercel.vercel.app
```

### "Upload gagal — file terlalu besar"

**Penyebab**: File melebihi 10 MB (backend limit).

**Solusi**: Kompres PDF atau perbesar limit di `src/routes/upload.js:11` dan frontend.

### "Upload gagal — storage error"

**Penyebab**: Bucket `pralokmin-files` belum dibuat.

**Solusi**: Buat bucket di Supabase Dashboard → Storage → New bucket.

### "Tabel tidak ditemukan (relation does not exist)"

**Penyebab**: Migration SQL belum dijalankan.

**Solusi**: Jalankan `sql/migration.sql` di Supabase SQL Editor.

### "Vercel 404 untuk halaman tertentu"

**Penyebab**: Route di `vercel.json` tidak sesuai.

**Solusi**: Pastikan pola di `routes` mencakup path yang diminta. Static files harus ada di folder `public/`.

### "Data tidak muncul di dashboard"

**Penyebab**: Filter tanggal atau klaster membatasi data.

**Solusi**: Reset filter di dashboard. Pastikan entries memiliki `tahun` dan `bulan` yang benar.

### "Download ZIP kosong"

**Penyebab**: File di storage sudah dihapus tapi metadata masih di database, atau file tidak bisa didownload.

**Solusi**: Cek `storage_path` di tabel `pralokmin_files`, pastikan file masih ada di Supabase Storage bucket.

### "Error: Hanya file PDF"

**Penyebab**: Upload file non-PDF.

**Solusi**: File harus berekstensi `.pdf` dengan MIME type `application/pdf`.

### "Perbedaan data antara backend dan frontend"

**Penyebab**: Backend pakai `supabaseAdmin` (service_role) sedangkan frontend mungkin pakai `supabase` (anon). Untuk backend semua route seharusnya sudah pakai `supabaseAdmin`.

**Solusi**: Pastikan semua route backend menggunakan `supabaseAdmin` (seperti di `units.js`, `indicators.js`, `entries.js`).

---

## 14. Cara Menambahkan Route Baru

1. Buat file baru di `src/routes/` (contoh: `reports.js`)
2. Gunakan pattern yang ada:

```js
const { Router } = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = Router();

router.get('/', async (req, res) => {
  try {
    // logic
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

3. Mount di `src/app.js`:

```js
app.use('/api/reports', require('./routes/reports'));
```

4. Jika perlu validasi file, gunakan multer. Jika perlu autentikasi, tambahkan middleware.

---

## 15. Changelog

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.0.0 | — | Initial release |

---

## 16. Lisensi & Kontribusi

**Lisensi**: —

**Kontribusi**: Silakan buka issue atau pull request di repository. Untuk pertanyaan teknis, hubungi tim pengembang.
