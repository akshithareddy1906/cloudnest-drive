
const request = require('supertest');

describe('CloudNest API Health', () => {
  test('GET /api/health returns success', async () => {
    const response = await request('http://localhost:5000')
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('CloudNest server is healthy');
  });

  test('GET / returns the API welcome message', async () => {
    const response = await request('http://localhost:5000').get('/');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('running');
  });

  test('unknown API route returns 404', async () => {
    const response = await request('http://localhost:5000')
      .get('/api/test-route-that-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

  test('health endpoint returns JSON', async () => {
    const response = await request('http://localhost:5000')
      .get('/api/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toHaveProperty('message');
  });

  test('unknown API route returns a helpful message', async () => {
    const response = await request('http://localhost:5000')
      .get('/api/route-that-does-not-exist');

    expect(response.body.message).toBe('API route not found.');
  });
