# Hasil Test — Temuan & Rekomendasi

## Ringkasan Hasil Akhir (setelah perbaikan)

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Statements | 98.26% | **99.7%** |
| Branches | 96.34% | **100%** |
| Functions | 96.77% | 96.77% |
| Lines | 99.66% | **100%** |
| Test passing | 87/88 (1 failed) | **95/95 (✅ all pass)** |

---

## ❌ Bug yang Diperbaiki: CSP protocol detection untuk 127.0.0.1

**File:** `src/app.js:26`

**Penyebab:**
```js
// Sebelum (salah):
const protocol = host?.includes('localhost') || host === '127.0.0.1' ? 'http' : 'https';
```
`req.get('host')` mengembalikan `'127.0.0.1:3000'` (dengan port), sehingga `host === '127.0.0.1'` bernilai `false`.

**Fix:**
```js
// Sesudah (benar):
const protocol = host?.includes('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https';
```

---

## ✅ Tambahan Test untuk Menutup Coverage

| File | Baris | Test ditambahkan |
|------|-------|-----------------|
| `routes/dashboard.test.js` | 15-16 | Null data tanpa error (branch `data ?`) |
| `routes/files.test.js` | 22 | Catch block di `GET /status/:bulan` saat `data` null |
| `routes/files.test.js` | 53, 61 | `!data` branch & `deleteDbError` branch di `DELETE /file/...` |
| `routes/files.test.js` | 123 | `deleteDbError` branch di `DELETE /files/...` |
| `routes/files.test.js` | 151 | Fallback label saat jenis file tak dikenal |
| `routes/upload.test.js` | 32 | JSON body tanpa file (trigger `req.files \|\| {}`) |

---

## 📊 Celah Coverage yang Tersisa

### ~~`src/routes/upload.js:40` — `if (!jenis) continue`~~ ✅ **Ditambahi `/* istanbul ignore next */`** (dead code — multer.fields() sudah memblokir field tak dikenal)

---

## ✅ Rekomendasi

1. ~~**Critical:** Fix bug CSP di `app.js:26`~~ ✅ **SELESAI**
2. ~~**Medium:** Tambah test untuk uncovered branches/lines~~ ✅ **SELESAI** (95 test, semuanya pass)
3. **Low:** Tambahkan `coverageThreshold` di Jest config untuk menjaga coverage tetap tinggi
4. ~~**Optional:** Beri `/* istanbul ignore next */` pada baris upload.js:40 karena dead code~~ ✅ **SELESAI**
