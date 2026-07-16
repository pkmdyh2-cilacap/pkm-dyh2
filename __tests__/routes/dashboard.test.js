const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');
const { buildMockChain } = require('../helpers/supabase-mock');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/dashboard', () => {
  it('returns 5 clusters with total, tercapai, belum, persen', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { status_capaian: 'Mencapai Target' },
        { status_capaian: 'Mencapai Target' },
        { status_capaian: 'Belum Tercapai' }
      ],
      error: null
    }));

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    res.body.forEach(klaster => {
      expect(klaster).toHaveProperty('klaster');
      expect(klaster).toHaveProperty('total');
      expect(klaster).toHaveProperty('tercapai');
      expect(klaster).toHaveProperty('belum');
      expect(klaster).toHaveProperty('persen');
    });
  });

  it('returns persen = 0 when data is empty', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: [], error: null }));

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    res.body.forEach(klaster => {
      expect(klaster.total).toBe(0);
      expect(klaster.persen).toBe(0);
    });
  });

  it('returns 500 on database error', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({ data: null, error: new Error('DB error') }));

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('calculates persen correctly for partial achievement', async () => {
    supabaseAdmin.from.mockReturnValue(buildMockChain({
      data: [
        { status_capaian: 'Mencapai Target' },
        { status_capaian: 'Mencapai Target' },
        { status_capaian: 'Mencapai Target' },
        { status_capaian: 'Belum Tercapai' },
        { status_capaian: 'Belum Tercapai' }
      ],
      error: null
    }));

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    res.body.forEach(klaster => {
      expect(klaster.total).toBe(5);
      expect(klaster.tercapai).toBe(3);
      expect(klaster.belum).toBe(2);
      expect(klaster.persen).toBe(60);
    });
  });
});
