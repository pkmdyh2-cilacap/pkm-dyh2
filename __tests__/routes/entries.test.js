const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');
const { buildMockChain } = require('../helpers/supabase-mock');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/entries', () => {
  it('returns all entries without filter', async () => {
    const mockData = [
      { id: 1, indikator_nama: 'Entry A', bulan: 'Januari', bor: true },
      { id: 2, indikator_nama: 'Entry B', bulan: 'Februari', bor: false }
    ];
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: mockData, error: null }));

    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by klaster query', async () => {
    const mockData = [
      { id: 1, indikator_nama: 'Entry A', klaster: 3, bor: false }
    ];
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: mockData, error: null }));

    const res = await request(app).get('/api/entries?klaster=3');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns empty array when data is null', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/entries', () => {
  it('creates entry with valid data', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [{ id: 10 }], error: null }));

    const res = await request(app).post('/api/entries').send({
      indikatorId: 1,
      petugas: 'Dr. X',
      bulan: 'Januari',
      tahun: '2024',
      periode: 'Januari 2024',
      indikatorNama: 'Indikator A',
      aktual: '80'
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 10);
  });

  it('stores BOR fields when bor is true', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [{ id: 11 }], error: null }));

    const res = await request(app).post('/api/entries').send({
      indikatorId: 1,
      petugas: 'Dr. Y',
      bulan: 'Januari',
      tahun: '2024',
      periode: 'Januari 2024',
      indikatorNama: 'BOR Test',
      bor: true,
      borHariRawat: 500,
      borTT: 100,
      borHariPeriode: 30
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('returns 500 when insert fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Insert failed') }));

    const res = await request(app).post('/api/entries').send({
      indikatorId: 1,
      petugas: 'Dr. Fail',
      bulan: 'Maret',
      tahun: '2024',
      periode: 'Maret 2024',
      indikatorNama: 'Gagal'
    });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('PUT /api/entries/:id', () => {
  it('updates entry and sets updated_at', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).put('/api/entries/1').send({
      indikatorId: 1,
      petugas: 'Dr. Z',
      bulan: 'Februari',
      tahun: '2024',
      periode: 'Februari 2024',
      indikatorNama: 'Updated'
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('updates entry with bor true', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).put('/api/entries/1').send({
      indikatorId: 1,
      petugas: 'Dr. Bor',
      bulan: 'Maret',
      tahun: '2024',
      periode: 'Maret 2024',
      indikatorNama: 'BOR Update',
      bor: true,
      borHariRawat: 400,
      borTT: 80,
      borHariPeriode: 30
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 500 when update fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Update failed') }));

    const res = await request(app).put('/api/entries/1').send({
      indikatorId: 1,
      petugas: 'Dr. Z',
      bulan: 'Februari',
      tahun: '2024',
      periode: 'Februari 2024',
      indikatorNama: 'Updated'
    });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Error handling', () => {
  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /api/entries/:id', () => {
  it('deletes entry', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: null }));

    const res = await request(app).delete('/api/entries/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 500 when delete fails', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('Delete failed') }));

    const res = await request(app).delete('/api/entries/1');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
