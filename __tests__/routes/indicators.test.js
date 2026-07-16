const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');
const { buildMockChain } = require('../helpers/supabase-mock');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/indicators', () => {
  it('returns list with bor as boolean', async () => {
    const mockData = [
      { id: 1, nama: 'Indikator A', unit: 'UGD', bor: true },
      { id: 2, nama: 'Indikator B', unit: 'IGD', bor: false }
    ];
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: mockData, error: null }));

    const res = await request(app).get('/api/indicators').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].bor).toBe(true);
    expect(res.body[1].bor).toBe(false);
  });

  it('returns empty array when data is null', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).get('/api/indicators').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 400 for invalid klaster', async () => {
    const res = await request(app).get('/api/indicators?klaster=0').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Klaster harus angka 1-5');
  });
});

describe('POST /api/indicators', () => {
  it('creates indicator with valid data', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [{ id: 1 }], error: null }));

    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: 'Indikator A', unit: 'UGD' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('creates indicator with bor true', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [{ id: 2 }], error: null }));

    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: 'Indikator BOR', unit: 'UGD', bor: true });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('rejects empty name', async () => {
    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: '', unit: 'UGD' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects missing unit', async () => {
    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: 'Indikator A' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects name over 200 characters', async () => {
    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: 'x'.repeat(201), unit: 'UGD' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Nama indikator maksimal 200 karakter.');
  });

  it('rejects unit over 200 characters', async () => {
    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: 'Indikator A', unit: 'x'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Unit pelayanan maksimal 200 karakter.');
  });

  it('rejects invalid klaster', async () => {
    const res = await request(app).post('/api/indicators?klaster=0').set('Authorization', 'Bearer test-token').send({ nama: 'Indikator A', unit: 'UGD' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Klaster harus angka 1-5');
  });

  it('returns 500 when insert fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Insert failed') }));

    const res = await request(app).post('/api/indicators').set('Authorization', 'Bearer test-token').send({ nama: 'Indikator Gagal', unit: 'UGD' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('PUT /api/indicators/:id', () => {
  it('updates indicator', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: 'Updated', unit: 'UGD' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('updates indicator with bor true', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: 'Updated', unit: 'UGD', bor: true });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('rejects update with empty name', async () => {
    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: '', unit: 'UGD' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects update with name over 200 characters', async () => {
    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: 'x'.repeat(201), unit: 'UGD' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Nama indikator maksimal 200 karakter.');
  });

  it('rejects update with empty unit', async () => {
    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: 'Updated', unit: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects update with unit over 200 characters', async () => {
    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: 'Updated', unit: 'x'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Unit pelayanan maksimal 200 karakter.');
  });

  it('returns 500 when update fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Update failed') }));

    const res = await request(app).put('/api/indicators/1').set('Authorization', 'Bearer test-token').send({ nama: 'Updated', unit: 'UGD' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Error handling', () => {
  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/indicators').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /api/indicators/:id', () => {
  it('deletes indicator', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).delete('/api/indicators/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 500 when delete fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Delete failed') }));

    const res = await request(app).delete('/api/indicators/1').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
