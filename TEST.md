# Panduan Testing — PKM Dyah2

Panduan ini mencakup strategi, setup, dan pelaksanaan testing untuk aplikasi PKM Dyah2.

---

## 1. Setup Lingkungan Test

### 1.1 Install Dependencies

```bash
npm install --save-dev jest supertest
```

### 1.2 Tambah Script ke `package.json`

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest --forceExit --detectOpenHandles",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

### 1.3 Struktur Folder Test

```
pkm-dyh2/
├── __tests__/
│   ├── setup.js              # Mock Supabase & env vars
│   ├── app.test.js           # Integration: CORS, CSP, error handler, static files
│   ├── routes/
│   │   ├── units.test.js
│   │   ├── indicators.test.js
│   │   ├── entries.test.js
│   │   ├── dashboard.test.js
│   │   ├── upload.test.js
│   │   └── files.test.js
│   └── helpers/
│       └── supabase-mock.js  # Helper mock data Supabase
```

---

## 2. Strategi Mocking

Semua route backend menggunakan `supabaseAdmin` (service role). Mock di level modul dengan `jest.mock`:

### `__tests__/setup.js`

```js
jest.mock('../src/config/supabase', () => {
  const mockStorage = {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    download: jest.fn(),
    remove: jest.fn()
  };

  return {
    supabase: {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      storage: mockStorage
    },
    supabaseAdmin: {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      storage: mockStorage
    }
  };
});

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '0';
```

---

## 3. Unit Testing per Route

### 3.1 Units — `__tests__/routes/units.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| `GET /api/units` tanpa filter | — | return array units, status 200 |
| `GET /api/units?klaster=1` | query `klaster=1` | filter by klaster 1 |
| `POST /api/units` nama valid | `{ nama: "Unit Baru" }` | status 201, return `{ id, message }` |
| `POST /api/units` nama kosong | `{ nama: "" }` | status 400, `{ error }` |
| `POST /api/units` duplikat | `{ nama: "Unit Ada" }` | status 400, `{ error: "Unit itu sudah ada." }` |
| `DELETE /api/units/:id` | `:id = 1` | status 200, `{ message }` |

### 3.2 Indicators — `__tests__/routes/indicators.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| `GET /api/indicators` | — | array indicators, field `bor` adalah boolean |
| `POST /api/indicators` valid | `{ nama: "Indikator A", unit: "UGD" }` | status 201 |
| `POST /api/indicators` nama kosong | `{ nama: "", unit: "UGD" }` | status 400 |
| `POST /api/indicators` tanpa unit | `{ nama: "Indikator A" }` | status 400 |
| `PUT /api/indicators/:id` | body update | status 200 |
| `DELETE /api/indicators/:id` | `:id = 1` | status 200 |

### 3.3 Entries — `__tests__/routes/entries.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| `GET /api/entries` tanpa filter | — | semua entries |
| `GET /api/entries?klaster=3` | query `klaster=3` | filter klaster 3 |
| `POST /api/entries` valid | body lengkap | status 201, return `{ id }` |
| `POST /api/entries` dengan BOR | body + field BOR | BOR fields tersimpan |
| `PUT /api/entries/:id` | body update | `updated_at` berubah |
| `DELETE /api/entries/:id` | `:id = 1` | status 200 |

### 3.4 Dashboard — `__tests__/routes/dashboard.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| `GET /api/dashboard` | — | array 5 klaster, masing-masing punya `total`, `tercapai`, `belum`, `persen` |
| `GET /api/dashboard` data kosong | mock return `[]` untuk semua klaster | semua `persen = 0` |
| `GET /api/dashboard` sebagian tercapai | mock 3 dari 5 tercapai | `persen = 60` |

### 3.5 Upload — `__tests__/routes/upload.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| `POST /api/upload` tanpa body | — | status 400, `{ error: "Bulan dan Klaster wajib diisi" }` |
| `POST /api/upload` tanpa file | `{ bulan, klaster }` | status 400, `{ error: "Tidak ada file yang diupload" }` |
| `POST /api/upload` file PDF valid | `multipart` 4 file | status 200, `{ success: true }` |
| `POST /api/upload` file non-PDF | file `.txt` | error "Hanya file PDF" |
| `POST /api/upload` file > 10MB | file oversized | error `LIMIT_FILE_SIZE` |

### 3.6 Files — `__tests__/routes/files.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| `GET /api/status/:bulan` | `:bulan = "2024-01"` | object 5 klaster, masing-masing 4 field boolean |
| `GET /api/files/:bulan/:klaster` | `:bulan, :klaster = 1` | array file metadata |
| `DELETE /api/file/:bulan/:klaster/:jenis` | file ada | status 200, file dihapus dari DB + storage |
| `DELETE /api/file/:bulan/:klaster/:jenis` | file tidak ada | status 404 |
| `DELETE /api/files/:bulan/:klaster` | file ada | semua file di klaster dihapus |
| `DELETE /api/files/:bulan/:klaster` | tidak ada file | status 404 |
| `GET /api/download/:bulan` | ada file | response `application/zip` |
| `GET /api/download/:bulan` | tidak ada file | status 404 `{ error }` |
| `GET /api/download-klaster/:bulan/:klaster` | ada file | response `application/zip` |
| `GET /api/download-klaster/:bulan/:klaster` | tidak ada file | status 404 |
| `GET /api/download/:bulan` | storage download gagal | header `X-Gagal-Files` |

---

## 4. Integration Testing — `__tests__/app.test.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| Static files: `GET /` | — | status 200, `text/html` |
| Static files: `GET /index.html` | — | status 200 |
| Static files: `GET /nonexistent.html` | — | status 404 |
| CORS: origin di whitelist | header `Origin: http://localhost:3000` | `Access-Control-Allow-Origin` ada |
| CORS: origin tidak dikenal | header `Origin: https://evil.com` | `Access-Control-Allow-Origin` tidak ada |
| CSP header | — | header `Content-Security-Policy` ada |
| Error handler: multer `LIMIT_FILE_SIZE` | — | status 400, `{ error: "Ukuran file maksimal 10 MB" }` |
| Error handler: non-PDF | — | status 400, `{ error: "Hanya file PDF yang diperbolehkan" }` |
| 404 route tidak dikenal | `GET /api/no-such-route` | status 404 |

---

## 5. Menjalankan Test

```bash
# Semua test
npm test

# Watch mode
npm run test:watch

# Dengan coverage
npm run test:coverage
```

---

## 6. Test Isolation

- Setiap file test meng-import `app.js` langsung (bukan `server.js`)
- Gunakan `supertest(app)` untuk membuat request HTTP
- Mock `supabaseAdmin` di `setup.js` — reset mock antar test dengan `beforeEach`
- Tidak perlu koneksi Supabase nyata — semua query di-mock

### Contoh Template Test

```js
const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/units', () => {
  it('returns list of units', async () => {
    const mockData = [
      { id: 1, klaster: 1, nama: 'UGD', created_at: '2024-01-01' }
    ];
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null })
    });

    const res = await request(app).get('/api/units?klaster=1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });

  it('handles errors', async () => {
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
    });

    const res = await request(app).get('/api/units');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
```

---

## 7. Coverage Target

| Area | Target |
|------|--------|
| Routes — Units | 100% |
| Routes — Indicators | 100% |
| Routes — Entries | 100% |
| Routes — Dashboard | 100% |
| Routes — Upload | 90% |
| Routes — Files | 90% |
| App (integration) | 90% |
| **Total** | **> 85%** |

---

## 8. Catatan Penting

- Jangan gunakan database sungguhan — selalu mock `supabaseAdmin`
- Untuk test upload, gunakan `Buffer` untuk simulasi file
- Test download ZIP perlu mock `supabaseAdmin.storage.from().download()` untuk return `Blob`
- Pastikan environment variables sudah di-set di `setup.js` sebelum import `app.js`
- Jalankan `npm test` sebelum commit untuk memastikan tidak ada regression

---

## 9. Rekomendasi Pengembangan Testing

### 9.1 Mutation Testing
Gunakan **Stryker** untuk mutation testing guna mendeteksi apakah test benar-benar memvalidasi behavior, bukan hanya mengeksekusi kode:
```bash
npm install --save-dev @stryker-mutator/core
npx stryker run
```

### 9.2 Integration / E2E Tests
Tambahkan integration test dengan **Supertest** untuk skenario nyata antar-route, atau **Playwright** untuk frontend.

### 9.3 Property-based Testing
Untuk fungsi kompleks, gunakan **fast-check** guna menguji properti invariant secara acak dan melengkapi example-based test.

### 9.4 Edge Cases & Error Handling
Pastikan skenario berikut tercakup meski coverage 100%:
- **Network timeouts / koneksi gagal** — mock `supabaseAdmin` agar reject/unexpected error
- **Invalid input format** — UUID tidak valid, tipe data salah
- **Concurrent requests** — multiple POST dalam waktu bersamaan
- **Boundary values** — string maksimal, angka negatif, empty array
- **Authorization / RBAC** — akses dari role berbeda

### 9.5 Pertahankan Strategi
Dokumentasikan strategi testing secara berkala agar tetap konsisten seiring bertambahnya fitur baru.
