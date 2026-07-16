# Hasil Debugging & Rencana Perbaikan - PKM Dyah2

## Bug Kritis

| # | Temuan | Lokasi | Dampak | Rencana Perbaikan |
|---|--------|--------|--------|-------------------|
| 1 | **CORS bypass total** - `callback(null, true)` selalu dipanggil meskipun origin tidak ada di whitelist | `src/app.js:13-16` | CORS whitelist tidak berfungsi, semua origin diizinkan | Ganti `callback(null, true)` dengan `callback(null, false)` jika origin tidak cocok |
| 2 | **File `.env` hilang** | root project | Aplikasi crash saat startup karena `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` undefined | Buat `.env` dan `.env.example` |
| 3 | **Ukuran file tidak sinkron** - Backend 4MB vs Frontend 5MB | `upload.js:10` vs `pralokmin.html:164` | File >4MB lolos frontend tapi ditolak backend | Seragamkan jadi 10 MB di kedua sisi |

## Bug Sedang

| # | Temuan | Lokasi | Dampak | Rencana Perbaikan |
|---|--------|--------|--------|-------------------|
| 4 | **CSP hardcoded** - domain Vercel dan Supabase URL di-hardcode | `src/app.js:24-30` | Gagal load resource saat di localhost/deploy di domain lain | Gunakan `req.get('host')` + env variable |
| 5 | **Vercel misconfig** - `express.static` tidak jalan di serverless | `vercel.json`, `api/index.js` | Static files tidak terkirim di Vercel | Pisahkan routing API dan static |
| 6 | **Inkonsistensi client Supabase** - `upload.js` & `files.js` pakai `supabaseAdmin`, sisanya pakai `supabase` | semua route files | Potensi masalah RLS/inconsistency | Semua route backend pakai `supabaseAdmin` |
| 7 | **`deleteAllFiles` inefisien** - fetch list lalu hapus 1x1 via HTTP | `pralokmin-klaster.html:333-348` | Lambat (4 request per klaster) | Buat endpoint `DELETE /api/files/:bulan/:klaster` di backend |
| 8 | **`yanlik.html` duplikasi script sidebar** - 2 block script hampir identik | `public/yanlik.html:127-197` | Berat, kode redundant | Gabung jadi satu script block |

## Bug Ringan

| # | Temuan | Lokasi | Rencana Perbaikan |
|---|--------|--------|-------------------|
| 9 | HTML `pralokmin-klaster.html` struktur broken - `<style>` & `<script>` di dalam `<main>` | `pralokmin-klaster.html:427-484` | Pindahkan `<style>` ke `<head>`, `<script>` setelah `</main>` |
| 10 | **Dead code** - Fungsi `parsePeriode()` tidak dipanggil | `dashboard-pkp.html:137-146` | Hapus |
| 11 | **Font Awesome versi beta** - `6.0.0-beta3` | semua HTML files | Upgrade ke `6.5.1` |
| 12 | **Validasi env kurang** - Tidak ada pengecekan env Supabase | `src/config/supabase.js:4-5` | Tambah guard di awal aplikasi |
| 13 | **Modal button "Download ZIP" misleading** - download per-klaster | `pralokmin-klaster.html:141` | Ubah label jadi "Download ZIP Klaster Ini" |
| 14 | **`modeBulanan` hidden vs visible tidak konsisten** - entri-pkp1/5 hidden, entri-pkp2/3/4 visible | entri-pkp HTML files | **DIBIARKAN** sesuai keputusan user |
