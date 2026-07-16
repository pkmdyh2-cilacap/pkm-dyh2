const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');
const { buildMockChain } = require('../helpers/supabase-mock');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/units', () => {
  it('returns list of units without filter', async () => {
    const mockData = [
      { id: 1, klaster: 1, nama: 'UGD', created_at: '2024-01-01' },
      { id: 2, klaster: 2, nama: 'IGD', created_at: '2024-01-01' }
    ];
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: mockData, error: null }));

    const res = await request(app).get('/api/units').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });

  it('filters by klaster query', async () => {
    const mockData = [{ id: 1, klaster: 1, nama: 'UGD', created_at: '2024-01-01' }];
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: mockData, error: null }));

    const res = await request(app).get('/api/units?klaster=1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });
});

describe('POST /api/units', () => {
  it('creates unit with valid name', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(buildMockChain({ data: null, error: null }))
      .mockReturnValueOnce(buildMockChain({ data: [{ id: 99 }], error: null }));

    const res = await request(app).post('/api/units').set('Authorization', 'Bearer test-token').send({ nama: 'Unit Baru' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 99);
    expect(res.body).toHaveProperty('message');
  });

  it('rejects empty name', async () => {
    const res = await request(app).post('/api/units').set('Authorization', 'Bearer test-token').send({ nama: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects name over 200 characters', async () => {
    const res = await request(app).post('/api/units').set('Authorization', 'Bearer test-token').send({ nama: 'x'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Nama unit maksimal 200 karakter.');
  });

  it('rejects invalid klaster', async () => {
    const res = await request(app).post('/api/units?klaster=abc').set('Authorization', 'Bearer test-token').send({ nama: 'Unit Baru' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Klaster harus angka 1-5');
  });

  it('rejects duplicate name', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [{ id: 1 }], error: null }));

    const res = await request(app).post('/api/units').set('Authorization', 'Bearer test-token').send({ nama: 'Unit Ada' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Unit itu sudah ada.');
  });

  it('returns 500 when insert fails', async () => {
    // panggilan pertama: cek duplikat (aman, tidak ada yang sama)
    // panggilan kedua: insert gagal
    supabaseAdmin.from
      .mockReturnValueOnce(buildMockChain({ data: null, error: null }))
      .mockReturnValueOnce(buildMockChain({ data: null, error: new Error('Insert failed') }));

    const res = await request(app).post('/api/units').set('Authorization', 'Bearer test-token').send({ nama: 'Unit Gagal' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Error handling', () => {
  it('returns 400 for invalid klaster', async () => {
    const res = await request(app).get('/api/units?klaster=0').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Klaster harus angka 1-5');
  });

  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/units').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /api/units/:id', () => {
  it('deletes unit by id', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).delete('/api/units/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 500 when delete fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Delete failed') }));

    const res = await request(app).delete('/api/units/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
