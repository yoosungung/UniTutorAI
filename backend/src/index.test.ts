import { describe, expect, it } from 'vitest';
import app from './index';

describe('GET /health', () => {
  it('returns ok JSON', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'ok',
      service: 'unitutor-backend',
    });
  });
});
