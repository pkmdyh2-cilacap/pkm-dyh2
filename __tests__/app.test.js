const request = require('supertest');
const app = require('../src/app');

describe('Static files', () => {
  it('GET / returns 200 with text/html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('GET /index.html returns 200', async () => {
    const res = await request(app).get('/index.html');
    expect(res.status).toBe(200);
  });

  it('GET /nonexistent.html returns 404', async () => {
    const res = await request(app).get('/nonexistent.html');
    expect(res.status).toBe(404);
  });
});

describe('CORS', () => {
  it('includes Access-Control-Allow-Origin for whitelisted origin', async () => {
    const res = await request(app)
      .get('/api/units')
      .set('Authorization', 'Bearer test-token')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('does not include Access-Control-Allow-Origin for unknown origin', async () => {
    const res = await request(app)
      .get('/api/units')
      .set('Authorization', 'Bearer test-token')
      .set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('CSP header', () => {
  it('includes Content-Security-Policy header', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain('default-src');
  });
});

describe('Error handler', () => {
  it('handles multer LIMIT_FILE_SIZE error', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', Buffer.allocUnsafe(11 * 1024 * 1024), 'large.pdf');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Ukuran file maksimal 10 MB');
  });

  it('handles non-PDF file error', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token')
      .field('bulan', '2024-01')
      .field('klaster', '1')
      .attach('undangan', Buffer.from('hello'), 'test.txt');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Hanya file PDF yang diperbolehkan');
  });
});

describe('404 route', () => {
  it('returns 404 for unknown API route', async () => {
    const res = await request(app).get('/api/no-such-route').set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(404);
  });
});
