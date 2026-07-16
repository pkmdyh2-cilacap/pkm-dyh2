const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');
const { buildMockChain } = require('../helpers/supabase-mock');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/upload', () => {
  it('returns 400 when bulan and klaster are missing', async () => {
    const res = await request(app).post('/api/upload').set('Authorization', 'Bearer test-token').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Bulan dan Klaster wajib diisi');
  });

  it('rejects invalid klaster value', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '0');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Klaster harus angka 1-5');
  });

  it('rejects bulan over 50 characters', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', 'x'.repeat(51))
      .field('klaster', '1');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Bulan maksimal 50 karakter');
  });

  it('returns 400 when no files are uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Tidak ada file yang diupload');
  });

  it('uploads valid PDF files successfully', async () => {
    supabaseAdmin.storage.from().upload.mockResolvedValue({ data: { path: 'test' }, error: null });
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', Buffer.from('%PDF-1.4 fake pdf content'), 'undangan.pdf')
      .attach('notulen', Buffer.from('%PDF-1.4 fake pdf content'), 'notulen.pdf');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('rejects non-PDF files with error', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', Buffer.from('not a pdf'), 'test.txt');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Hanya file PDF yang diperbolehkan');
  });

  it('handles storage upload failure', async () => {
    supabaseAdmin.storage.from().upload.mockResolvedValue({ data: null, error: new Error('Storage timeout') });
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', Buffer.from('%PDF-1.4 test'), 'test.pdf');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('handles database insert failure after upload', async () => {
    supabaseAdmin.storage.from().upload.mockResolvedValue({ data: { path: 'test' }, error: null });
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Insert failed') }));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', Buffer.from('%PDF-1.4 test'), 'test.pdf');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('handles missing req.files gracefully via JSON body (req.files || {} fallback)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .set('Content-Type', 'application/json')
      .send({ bulan: '2024-01', klaster: '1' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Tidak ada file yang diupload');
  });

  it('rejects files larger than 10 MB', async () => {
    const largeBuffer = Buffer.allocUnsafe(11 * 1024 * 1024);

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', largeBuffer, 'large.pdf');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Ukuran file maksimal 10 MB');
  });
});
