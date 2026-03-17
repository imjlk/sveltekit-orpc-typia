import { describe, expect, test } from 'bun:test';
import { scryptSync } from 'node:crypto';
import { hashPassword, verifyPassword } from './kernel-node';

describe('auth hasher kernel node loader', () => {
  test('round-trips an argon2id password hash', async () => {
    const hash = await hashPassword('password1234');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'password1234')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  test('verifies legacy scrypt hashes for compatibility', async () => {
    const salt = 'legacy-salt';
    const keyHex = scryptSync('password1234', salt, 64, {
      N: 2 ** 14,
      r: 16,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }).toString('hex');
    const legacyHash = `${salt}:${keyHex}`;

    expect(await verifyPassword(legacyHash, 'password1234')).toBe(true);
  });
});
