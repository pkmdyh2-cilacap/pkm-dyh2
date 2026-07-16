const request = require('supertest');
const app = require('../../src/app');
const { supabaseAdmin } = require('../../src/config/supabase');

const mockGetUser = supabaseAdmin.auth.getUser;
const mockSignInWithPassword = supabaseAdmin.auth.signInWithPassword;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'test-user', email: 'admin@puskesmas.id' } },
    error: null
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'secret' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials')
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns token on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'test-token' },
        user: { id: 'user-1', email: 'admin@puskesmas.id' }
      },
      error: null
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@puskesmas.id', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token', 'test-token');
    expect(res.body.user).toHaveProperty('email', 'admin@puskesmas.id');
  });

  it('returns 500 on unexpected error', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Unexpected error'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@puskesmas.id', password: 'correct' });
    expect(res.status).toBe(500);
  });

  it('returns 500 when signInWithPassword throws', async () => {
    mockSignInWithPassword.mockImplementation(() => { throw new Error('Throw error'); });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@puskesmas.id', password: 'correct' });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns success without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns success with valid token', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'test-token' },
        user: { id: 'user-1', email: 'admin@puskesmas.id' }
      },
      error: null
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@puskesmas.id', password: 'correct' });

    supabaseAdmin.auth.admin.signOut.mockResolvedValue({ error: null });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer ' + loginRes.body.token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns success even when signOut throws', async () => {
    supabaseAdmin.auth.admin.signOut.mockRejectedValue(new Error('Sign out failed'));

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer some-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('returns user info with valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@puskesmas.id' } },
      error: null
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'admin@puskesmas.id');
  });
});

describe('API protection', () => {
  it('returns 401 for /api/entries without token', async () => {
    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(401);
  });

  it('returns 401 when getUser throws', async () => {
    mockGetUser.mockImplementation(() => { throw new Error('Unexpected error'); });

    const res = await request(app)
      .get('/api/entries')
      .set('Authorization', 'Bearer some-token');
    expect(res.status).toBe(401);
  });

  it('returns 200 for /api/entries with valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@puskesmas.id' } },
      error: null
    });
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    });

    const res = await request(app)
      .get('/api/entries')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });

  it('allows access to /api/auth/* without token', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials')
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'p' });
    expect(res.status).toBe(401);
  });
});
