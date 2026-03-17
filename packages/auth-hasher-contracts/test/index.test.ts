import { describe, expect, test } from 'bun:test';
import {
  AUTH_HASHER_PRESET_IDS,
  FREE_TIER_FALLBACK_2026Q1_PRESET,
  STANDARD_2026Q1_PRESET,
  assessPasswordHash,
  canonicalizePresetId,
  isMetadataRouteEnabled,
  parseStoredPasswordHash,
  resolveHasherPreset,
} from '../src/index';

const STANDARD_HASH =
  '$argon2id$v=19$m=12288,t=3,p=1$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const LOWER_COST_HASH =
  '$argon2id$v=19$m=4096,t=1,p=1$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

describe('auth hasher contracts', () => {
  test('resolves the standard preset by default', () => {
    expect(resolveHasherPreset(undefined)).toEqual(STANDARD_2026Q1_PRESET);
  });

  test('resolves the free-tier fallback preset from env', () => {
    expect(
      resolveHasherPreset({
        AUTH_HASHER_PRESET_ID: FREE_TIER_FALLBACK_2026Q1_PRESET.id,
      }),
    ).toEqual(FREE_TIER_FALLBACK_2026Q1_PRESET);
  });

  test('canonicalizes legacy preset aliases', () => {
    expect(canonicalizePresetId('standard-recommended')).toBe(AUTH_HASHER_PRESET_IDS.standard2026Q1);
    expect(canonicalizePresetId('free-safe-probe')).toBe(AUTH_HASHER_PRESET_IDS.freeTierFallback2026Q1);
  });

  test('parses stored password hash formats', () => {
    expect(parseStoredPasswordHash(STANDARD_HASH)).toMatchObject({
      format: 'argon2id',
      version: 19,
      argon2id: {
        memoryKiB: 12288,
        timeCost: 3,
        parallelism: 1,
        outputLength: 32,
      },
    });

    expect(parseStoredPasswordHash('legacy-salt:abcdef')).toEqual({
      format: 'legacy-scrypt',
      salt: 'legacy-salt',
      keyHex: 'abcdef',
    });
  });

  test('assesses when a password hash needs rehashing', () => {
    expect(assessPasswordHash(STANDARD_HASH).needsRehash).toBe(false);
    expect(assessPasswordHash(LOWER_COST_HASH).reasons).toEqual(['argon2-memory', 'argon2-time-cost']);
    expect(assessPasswordHash('legacy-salt:abcdef').reasons).toEqual(['legacy-scrypt-format']);
  });

  test('supports metadata route toggle parsing', () => {
    expect(isMetadataRouteEnabled(undefined)).toBe(true);
    expect(isMetadataRouteEnabled({ AUTH_HASHER_ENABLE_METADATA_ROUTE: 'false' })).toBe(false);
  });
});
