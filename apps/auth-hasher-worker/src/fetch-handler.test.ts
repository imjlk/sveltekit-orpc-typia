import { describe, expect, test } from 'bun:test';
import { buildMetadata, handleFetch } from './fetch-handler';

describe('auth hasher fetch handler', () => {
  test('returns metadata from GET /', async () => {
    const response = handleFetch(new Request('https://auth-hasher.example.com/'));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual(
      expect.objectContaining({
        algorithm: 'argon2id',
        version: '0.1.0',
        artifactSourceChecksum: expect.any(String),
        preset: 'standard-2026q1',
        argon2id: {
          memoryKiB: 12 * 1024,
          timeCost: 3,
          parallelism: 1,
          outputLength: 32,
        },
        rpc: ['hashPassword', 'verifyPassword'],
        owaspAligned: true,
      }),
    );
  });

  test('metadata reflects the built artifact instead of runtime env overrides', () => {
    expect(
      buildMetadata({
        AUTH_HASHER_PRESET_ID: 'free-tier-fallback-2026q1',
      }),
    ).toEqual(
      expect.objectContaining({
        preset: 'standard-2026q1',
        argon2id: {
          memoryKiB: 12 * 1024,
          timeCost: 3,
          parallelism: 1,
          outputLength: 32,
        },
        owaspAligned: true,
      }),
    );
  });

  test('returns 404 when the metadata route is disabled', async () => {
    const response = handleFetch(new Request('https://auth-hasher.example.com/'), {
      AUTH_HASHER_ENABLE_METADATA_ROUTE: 'false',
    });

    expect(response.status).toBe(404);
  });

  test('returns 404 for non-root fetch requests', async () => {
    const response = handleFetch(new Request('https://auth-hasher.example.com/hash', { method: 'POST' }));
    expect(response.status).toBe(404);
  });
});
