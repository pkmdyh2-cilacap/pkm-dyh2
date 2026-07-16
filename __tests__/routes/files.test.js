const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');
const { buildMockChain } = require('../helpers/supabase-mock');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/status/:bulan', () => {
  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: { message: 'DB error' } }));

    const res = await request(app).get('/api/status/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 when data is null without explicit error (catch block)', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).get('/api/status/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('returns object with 5 clusters each having 4 boolean fields', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { klaster: 1, jenis: 'undangan' },
        { klaster: 1, jenis: 'notulen' },
        { klaster: 2, jenis: 'daftar_hadir' }
      ],
      error: null
    }));

    const res = await request(app).get('/api/status/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    const body = res.body;
    expect(Object.keys(body)).toHaveLength(5);
    for (let i = 1; i <= 5; i++) {
      expect(body[i]).toHaveProperty('undangan');
      expect(body[i]).toHaveProperty('notulen');
      expect(body[i]).toHaveProperty('daftar_hadir');
      expect(body[i]).toHaveProperty('lampiran');
    }
    expect(body['1'].undangan).toBe(true);
    expect(body['1'].notulen).toBe(true);
    expect(body['2'].daftar_hadir).toBe(true);
    expect(body['3'].undangan).toBe(false);
  });
});

describe('GET /api/files/:bulan/:klaster', () => {
  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/files/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('returns file metadata array', async () => {
    const mockData = [
      { jenis: 'undangan', nama_file: 'test.pdf', storage_path: 'path', ukuran: 1000, diupload_pada: '2024-01-01' }
    ];
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: mockData, error: null }));

    const res = await request(app).get('/api/files/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('jenis');
    expect(res.body[0]).toHaveProperty('nama_file');
  });
});

describe('DELETE /api/file/:bulan/:klaster/:jenis', () => {
  it('deletes file when it exists', async () => {
    const singleData = { storage_path: '2024-01/klaster1/undangan/test.pdf' };
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: singleData, error: null }));

    const res = await request(app).delete('/api/file/2024-01/1/undangan').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('returns 404 when file does not exist', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: { message: 'Not found' } }));

    const res = await request(app).delete('/api/file/2024-01/1/undangan').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
  });

  it('returns 404 when single() returns null without fetchError (branch !data)', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).delete('/api/file/2024-01/1/undangan').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'File tidak ditemukan');
  });

  it('handles database delete error for single file (branch deleteDbError)', async () => {
    const singleData = { storage_path: '2024-01/klaster1/undangan/test.pdf' };
    supabaseAdmin.from
      .mockReturnValueOnce(buildMockChain({ data: singleData, error: null }))
      .mockReturnValueOnce(buildMockChain({ data: null, error: new Error('Delete failed') }));

    const res = await request(app).delete('/api/file/2024-01/1/undangan').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /api/files/:bulan/:klaster', () => {
  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).delete('/api/files/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('deletes all files in a cluster', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { storage_path: 'path1', jenis: 'undangan' },
        { storage_path: 'path2', jenis: 'notulen' }
      ],
      error: null
    }));

    const res = await request(app).delete('/api/files/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('handles database delete error for cluster files (branch deleteDbError)', async () => {
    const files = [
      { storage_path: 'path1', jenis: 'undangan' },
    ];
    supabaseAdmin.from
      .mockReturnValueOnce(buildMockChain({ data: files, error: null }))
      .mockReturnValueOnce(buildMockChain({ data: null, error: new Error('Delete failed') }));

    const res = await request(app).delete('/api/files/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when no files exist', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [], error: null }));

    const res = await request(app).delete('/api/files/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/download/:bulan', () => {
  it('returns application/zip when files exist', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { klaster: 1, jenis: 'undangan', storage_path: 'path1', nama_file: 'test.pdf' }
      ],
      error: null
    }));
    const mockBlob = { arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer) };
    supabaseAdmin.storage.from().download.mockResolvedValue({ data: mockBlob, error: null });

    const res = await request(app).get('/api/download/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
  });

  it('returns 404 when no files exist', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [], error: null }));

    const res = await request(app).get('/api/download/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 when all downloads fail', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { klaster: 1, jenis: 'undangan', storage_path: 'path1', nama_file: 'a.pdf' }
      ],
      error: null
    }));
    supabaseAdmin.storage.from().download.mockResolvedValue({ data: null, error: new Error('Failed') });

    const res = await request(app).get('/api/download/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/download/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('sets X-Gagal-Files header when some downloads fail', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { klaster: 1, jenis: 'undangan', storage_path: 'path1', nama_file: 'ok.pdf' },
        { klaster: 1, jenis: 'notulen', storage_path: 'path2', nama_file: 'fail.pdf' }
      ],
      error: null
    }));
    const mockBlob = { arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer) };
    supabaseAdmin.storage.from()
      .download.mockResolvedValueOnce({ data: mockBlob, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Download failed') });

    const res = await request(app).get('/api/download/2024-01').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.headers['x-gagal-files']).toBeDefined();
  });
});

describe('GET /api/download-klaster/:bulan/:klaster', () => {
  it('returns 500 when all downloads fail', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { jenis: 'undangan', storage_path: 'path1', nama_file: 'a.pdf' }
      ],
      error: null
    }));
    supabaseAdmin.storage.from().download.mockResolvedValue({ data: null, error: new Error('Failed') });

    const res = await request(app).get('/api/download-klaster/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('sets X-Gagal-Files header when some downloads fail', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { jenis: 'undangan', storage_path: 'path1', nama_file: 'ok.pdf' },
        { jenis: 'notulen', storage_path: 'path2', nama_file: 'fail.pdf' }
      ],
      error: null
    }));
    const mockBlob = { arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer) };
    supabaseAdmin.storage.from()
      .download.mockResolvedValueOnce({ data: mockBlob, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Download failed') });

    const res = await request(app).get('/api/download-klaster/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.headers['x-gagal-files']).toBeDefined();
  });

  it('returns application/zip when files exist', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { jenis: 'undangan', storage_path: 'path1', nama_file: 'test.pdf' }
      ],
      error: null
    }));
    const mockBlob = { arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer) };
    supabaseAdmin.storage.from().download.mockResolvedValue({ data: mockBlob, error: null });

    const res = await request(app).get('/api/download-klaster/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
  });

  it('uses original jenis as label when jenis is unknown (branch || fallback)', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { jenis: 'foto_kegiatan', storage_path: 'path1', nama_file: 'foto.jpg' }
      ],
      error: null
    }));
    const mockBlob = { arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer) };
    supabaseAdmin.storage.from().download.mockResolvedValue({ data: mockBlob, error: null });

    const res = await request(app).get('/api/download-klaster/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
  });

  it('returns 404 when no files exist', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [], error: null }));

    const res = await request(app).get('/api/download-klaster/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/download-klaster/2024-01/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
