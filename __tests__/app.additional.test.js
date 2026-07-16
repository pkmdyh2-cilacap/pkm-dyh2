// ============================================================
// TEST TAMBAHAN untuk app.js
// Sisipkan blok-blok describe di bawah ini ke dalam
// __tests__/app.test.js yang sudah ada (jangan overwrite file lama,
// cukup tempel di bagian bawah, sebelum baris terakhir jika ada).
// Pastikan import di bagian atas app.test.js sudah termasuk:
//   const app = require('../src/app');
//   const { supabaseAdmin } = require('../src/config/supabase');
//   const { buildMockChain } = require('./helpers/supabase-mock');
// ============================================================

const request = require('supertest');
const app = require('../src/app');
const { supabaseAdmin } = require('../src/config/supabase');
const { buildMockChain } = require('./helpers/supabase-mock');

describe('GET /', () => {
  it('serves index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

describe('errorHandler (global error middleware)', () => {
  // Dipanggil langsung sebagai fungsi, tanpa lewat HTTP request,
  // karena error generik/tak terduga sulit dipicu natural via supertest
  // (setiap route sudah punya try/catch sendiri).

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('handles MulterError with LIMIT_FILE_SIZE code', () => {
    const multer = require('multer');
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    const res = mockRes();

    app.errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Ukuran file maksimal 10 MB' });
  });

  it('handles other MulterError codes (fallback branch, baris 57)', () => {
    const multer = require('multer');
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    const res = mockRes();

    app.errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: err.message });
  });

  it('handles custom "Hanya file PDF" error message', () => {
    const err = new Error('Hanya file PDF');
    const res = mockRes();

    app.errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Hanya file PDF yang diperbolehkan' });
  });

  it('falls back to 500 for unexpected/generic errors (baris 60)', () => {
    const err = new Error('Something totally unexpected broke');
    const res = mockRes();

    app.errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Something totally unexpected broke' });
  });

  it('falls back to default message when error has no message', () => {
    const err = new Error();
    err.message = '';
    const res = mockRes();

    app.errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
  });
});

describe('cekKoneksi (pengecekan koneksi Supabase saat startup)', () => {
  // Dipanggil langsung karena fungsi ini normalnya berjalan sebagai
  // side-effect saat modul di-import, bukan lewat endpoint HTTP.

  it('logs success when connection is fine', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [], error: null }));

    await app.cekKoneksi();

    expect(logSpy).toHaveBeenCalledWith('✅ Koneksi Supabase berhasil');
    logSpy.mockRestore();
  });

  it('logs warning when table does not exist yet', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    supabaseAdmin.from.mockReturnValue(
      buildMockChain({ data: null, error: new Error('relation "pralokmin_files" does not exist') })
    );

    await app.cekKoneksi();

    expect(logSpy).toHaveBeenCalledWith('⚠️ Tabel pralokmin_files belum ada');
    logSpy.mockRestore();
  });

  it('logs error for other connection failures', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabaseAdmin.from.mockReturnValue(
      buildMockChain({ data: null, error: new Error('connection timeout') })
    );

    await app.cekKoneksi();

    expect(errSpy).toHaveBeenCalledWith('❌ Gagal koneksi ke Supabase:', 'connection timeout');
    errSpy.mockRestore();
  });

  it('handles error object with no message (baris 72 fallback branch)', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const errNoMessage = new Error();
    errNoMessage.message = '';
    supabaseAdmin.from.mockReturnValue(
      buildMockChain({ data: null, error: errNoMessage })
    );

    await app.cekKoneksi();

    expect(errSpy).toHaveBeenCalledWith('❌ Gagal koneksi ke Supabase:', '');
    errSpy.mockRestore();
  });
});

describe('CORS & CSP default env vars (baris 14, 21)', () => {
  // Nilai default (CORS_ORIGIN, SUPABASE_URL) dihitung sekali saat
  // modul di-load. dotenv.config() dimock agar TIDAK menimpa ulang
  // env var dari file .env project saat app.js di-require ulang —
  // kalau tidak, branch default (||) tidak akan pernah kepakai
  // selama .env berisi nilai untuk var tersebut.

  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    jest.dontMock('dotenv');
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('uses default CORS origin list when CORS_ORIGIN is not set', async () => {
    delete process.env.CORS_ORIGIN;
    const freshApp = require('../src/app');

    const res = await request(freshApp).get('/').set('Origin', 'http://localhost:3000');
    expect(res.status).toBe(200);
  });

  it('uses default Supabase URL when SUPABASE_URL is not set', () => {
    delete process.env.SUPABASE_URL;
    expect(() => require('../src/app')).not.toThrow();
  });
});

describe('CSP protocol detection (baris 26)', () => {
  it('sets protocol to http when host contains localhost', async () => {
    const res = await request(app).get('/').set('Host', 'localhost:3000');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toContain('http://localhost:3000');
  });

  it('sets protocol to http when host is 127.0.0.1', async () => {
    const res = await request(app).get('/').set('Host', '127.0.0.1:3000');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toContain('http://127.0.0.1:3000');
  });

  it('sets protocol to https for non-localhost host', async () => {
    const res = await request(app).get('/').set('Host', 'myapp.example.com');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toContain('https://myapp.example.com');
  });
});
