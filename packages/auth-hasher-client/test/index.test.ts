import { describe, expect, test } from 'bun:test';
import {
  STANDARD_2026Q1_PRESET,
  isLocalAuthHasherProxyError,
  verifyAndMaybeRehash,
} from '../src/index';

describe('auth hasher client', () => {
  test('returns verified false when password verification fails', async () => {
    const result = await verifyAndMaybeRehash(
      {
        hashPassword: async () => 'unused',
        verifyPassword: async () => false,
      },
      'legacy-salt:abcdef',
      'wrong-password',
    );

    expect(result).toEqual({
      verified: false,
      needsRehash: false,
      rehashed: false,
      updatedHash: null,
      reasons: [],
    });
  });

  test('rehashes a weaker password hash when verification succeeds', async () => {
    const hashes: string[] = [];
    const result = await verifyAndMaybeRehash(
      {
        hashPassword: async () => {
          const nextHash =
            '$argon2id$v=19$m=12288,t=3,p=1$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
          hashes.push(nextHash);
          return nextHash;
        },
        verifyPassword: async () => true,
      },
      'legacy-salt:abcdef',
      'password1234',
      {
        targetPreset: STANDARD_2026Q1_PRESET,
      },
    );

    const [updatedHash] = hashes;
    expect(hashes).toHaveLength(1);
    expect(updatedHash).toBeDefined();
    expect(result.verified).toBe(true);
    expect(result.needsRehash).toBe(true);
    expect(result.rehashed).toBe(true);
    expect(result.updatedHash).toBe(updatedHash ?? null);
    expect(result.reasons).toEqual(['legacy-scrypt-format']);
  });

  test('detects local Wrangler service proxy failures', () => {
    expect(
      isLocalAuthHasherProxyError(
        new Error(
          `Cannot access "hashPassword" as we couldn't find a local dev session for the "default" entrypoint of service "cloudflare-first-starter-auth-hasher" to proxy to.`,
        ),
      ),
    ).toBe(true);
    expect(
      isLocalAuthHasherProxyError(
        new Error(
          `Worker "cloudflare-first-starter-auth-hasher" not found. Make sure it is running locally.`,
        ),
      ),
    ).toBe(true);
    expect(isLocalAuthHasherProxyError(new Error('network connection failed'))).toBe(false);
  });
});
