const ARGON2_VERSION = 19;
const ARGON2_PHC_REGEX =
  /^\$(argon2id)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/.-]+)\$([A-Za-z0-9+/.-]+)$/;

export const AUTH_HASHER_PRESET_IDS = {
  standard2026Q1: 'standard-2026q1',
  freeTierFallback2026Q1: 'free-tier-fallback-2026q1',
  envTuned: 'env-tuned',
} as const;

export const LEGACY_PRESET_ID_ALIASES = {
  'standard-recommended': AUTH_HASHER_PRESET_IDS.standard2026Q1,
  'free-safe-probe': AUTH_HASHER_PRESET_IDS.freeTierFallback2026Q1,
} as const;

export const AUTH_HASHER_ENV_KEYS = {
  presetId: 'AUTH_HASHER_PRESET_ID',
  memoryKiB: 'AUTH_HASHER_ARGON2_MEMORY_KIB',
  timeCost: 'AUTH_HASHER_ARGON2_TIME_COST',
  parallelism: 'AUTH_HASHER_ARGON2_PARALLELISM',
  outputLength: 'AUTH_HASHER_ARGON2_OUTPUT_LENGTH',
  metadataRouteEnabled: 'AUTH_HASHER_ENABLE_METADATA_ROUTE',
  workerCpuMs: 'AUTH_HASHER_WORKER_CPU_MS',
} as const;

export interface Argon2idConfig {
  memoryKiB: number;
  timeCost: number;
  parallelism: number;
  outputLength: number;
}

export interface LegacyScryptConfig {
  logN: number;
  r: number;
  p: number;
  outputLength: number;
}

export interface HashPresetDefinition {
  id: string;
  description: string;
  argon2id: Argon2idConfig;
  legacyScrypt: LegacyScryptConfig;
}

export interface AuthHasherRuntimeEnv {
  AUTH_HASHER_PRESET_ID?: string | number;
  AUTH_HASHER_ARGON2_MEMORY_KIB?: string | number;
  AUTH_HASHER_ARGON2_TIME_COST?: string | number;
  AUTH_HASHER_ARGON2_PARALLELISM?: string | number;
  AUTH_HASHER_ARGON2_OUTPUT_LENGTH?: string | number;
  AUTH_HASHER_ENABLE_METADATA_ROUTE?: string | number;
  AUTH_HASHER_WORKER_CPU_MS?: string | number;
}

export interface AuthHasherRpc {
  hashPassword(password: string): Promise<string>;
  verifyPassword(hash: string, password: string): Promise<boolean>;
}

export interface AuthHasherBinding extends AuthHasherRpc {
  fetch?(request: Request): Promise<Response>;
}

export interface AuthHasherBuildManifest {
  artifactPreset: string;
  artifactArgon2id: Argon2idConfig;
  artifactOwaspAligned: boolean;
  artifactSourceChecksum: string;
  generatedBy: string;
  inputs: string[];
}

export interface AuthHasherMetadata {
  algorithm: 'argon2id';
  version: string;
  artifactSourceChecksum: string;
  preset: string;
  argon2id: Argon2idConfig;
  rpc: ['hashPassword', 'verifyPassword'];
  owaspAligned: boolean;
}

export type PasswordHashFormat = 'argon2id' | 'legacy-scrypt';

export type PasswordHashUpgradeReason =
  | 'legacy-scrypt-format'
  | 'argon2-version'
  | 'argon2-memory'
  | 'argon2-time-cost'
  | 'argon2-parallelism'
  | 'argon2-output-length';

export interface ParsedArgon2PasswordHash {
  format: 'argon2id';
  version: number;
  argon2id: Argon2idConfig;
  saltBase64: string;
  hashBase64: string;
}

export interface ParsedLegacyScryptPasswordHash {
  format: 'legacy-scrypt';
  salt: string;
  keyHex: string;
}

export type ParsedPasswordHash = ParsedArgon2PasswordHash | ParsedLegacyScryptPasswordHash;

export interface PasswordHashRehashAssessment {
  parsed: ParsedPasswordHash;
  needsRehash: boolean;
  reasons: PasswordHashUpgradeReason[];
}

export const STANDARD_2026Q1_PRESET = {
  id: AUTH_HASHER_PRESET_IDS.standard2026Q1,
  description: 'Canonical Argon2id preset for the Cloudflare First Starter.',
  argon2id: {
    memoryKiB: 12 * 1024,
    timeCost: 3,
    parallelism: 1,
    outputLength: 32,
  },
  legacyScrypt: {
    logN: 14,
    r: 16,
    p: 1,
    outputLength: 64,
  },
} as const satisfies HashPresetDefinition;

export const FREE_TIER_FALLBACK_2026Q1_PRESET = {
  id: AUTH_HASHER_PRESET_IDS.freeTierFallback2026Q1,
  description: 'Lower-cost fallback preset for constrained Workers plans.',
  argon2id: {
    memoryKiB: 4 * 1024,
    timeCost: 1,
    parallelism: 1,
    outputLength: 32,
  },
  legacyScrypt: STANDARD_2026Q1_PRESET.legacyScrypt,
} as const satisfies HashPresetDefinition;

export const STANDARD_RECOMMENDED_PRESET = STANDARD_2026Q1_PRESET;

const runtimeEnvValue = (
  env: Partial<AuthHasherRuntimeEnv> | Record<string, unknown> | null | undefined,
  key: keyof AuthHasherRuntimeEnv,
): string | undefined => {
  const value = env?.[key];
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
};

const parsePositiveInteger = (label: string, rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer. Received '${rawValue}'.`);
  }

  return parsed;
};

const parseBoolean = (label: string, rawValue: string | undefined, fallback: boolean): boolean => {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`${label} must be true/false or 1/0. Received '${rawValue}'.`);
};

const base64ByteLength = (rawValue: string): number => {
  const remainder = rawValue.length % 4;
  const padding = remainder === 0 ? 0 : 4 - remainder;
  const normalizedLength = rawValue.length + padding;
  return Math.floor((normalizedLength * 3) / 4) - padding;
};

export const canonicalizePresetId = (rawPresetId: string | undefined, hasArgonOverrides = false): string => {
  if (!rawPresetId) {
    return hasArgonOverrides ? AUTH_HASHER_PRESET_IDS.envTuned : STANDARD_2026Q1_PRESET.id;
  }

  return LEGACY_PRESET_ID_ALIASES[rawPresetId as keyof typeof LEGACY_PRESET_ID_ALIASES] ?? rawPresetId;
};

export const resolveHasherPreset = (
  env: Partial<AuthHasherRuntimeEnv> | Record<string, unknown> | null | undefined,
): HashPresetDefinition => {
  const presetId = runtimeEnvValue(env, AUTH_HASHER_ENV_KEYS.presetId);
  const memoryKiB = runtimeEnvValue(env, AUTH_HASHER_ENV_KEYS.memoryKiB);
  const timeCost = runtimeEnvValue(env, AUTH_HASHER_ENV_KEYS.timeCost);
  const parallelism = runtimeEnvValue(env, AUTH_HASHER_ENV_KEYS.parallelism);
  const outputLength = runtimeEnvValue(env, AUTH_HASHER_ENV_KEYS.outputLength);
  const hasArgonOverrides = Boolean(memoryKiB || timeCost || parallelism || outputLength);
  const canonicalPresetId = canonicalizePresetId(presetId, hasArgonOverrides);
  const basePreset =
    !hasArgonOverrides && canonicalPresetId === FREE_TIER_FALLBACK_2026Q1_PRESET.id
      ? FREE_TIER_FALLBACK_2026Q1_PRESET
      : STANDARD_2026Q1_PRESET;

  return {
    id: canonicalPresetId,
    description: hasArgonOverrides
      ? 'Argon2id preset loaded from AUTH_HASHER_* environment variables.'
      : basePreset.description,
    argon2id: {
      memoryKiB: parsePositiveInteger(AUTH_HASHER_ENV_KEYS.memoryKiB, memoryKiB, basePreset.argon2id.memoryKiB),
      timeCost: parsePositiveInteger(AUTH_HASHER_ENV_KEYS.timeCost, timeCost, basePreset.argon2id.timeCost),
      parallelism: parsePositiveInteger(
        AUTH_HASHER_ENV_KEYS.parallelism,
        parallelism,
        basePreset.argon2id.parallelism,
      ),
      outputLength: parsePositiveInteger(
        AUTH_HASHER_ENV_KEYS.outputLength,
        outputLength,
        basePreset.argon2id.outputLength,
      ),
    },
    legacyScrypt: { ...STANDARD_2026Q1_PRESET.legacyScrypt },
  };
};

export const isMetadataRouteEnabled = (
  env: Partial<AuthHasherRuntimeEnv> | Record<string, unknown> | null | undefined,
): boolean =>
  parseBoolean(
    AUTH_HASHER_ENV_KEYS.metadataRouteEnabled,
    runtimeEnvValue(env, AUTH_HASHER_ENV_KEYS.metadataRouteEnabled),
    true,
  );

export const isOwaspAlignedPreset = (preset: HashPresetDefinition): boolean =>
  preset.argon2id.memoryKiB >= STANDARD_2026Q1_PRESET.argon2id.memoryKiB &&
  preset.argon2id.timeCost >= STANDARD_2026Q1_PRESET.argon2id.timeCost &&
  preset.argon2id.parallelism >= STANDARD_2026Q1_PRESET.argon2id.parallelism &&
  preset.argon2id.outputLength >= STANDARD_2026Q1_PRESET.argon2id.outputLength;

export const parseStoredPasswordHash = (hash: string): ParsedPasswordHash => {
  const argonMatch = ARGON2_PHC_REGEX.exec(hash);
  if (argonMatch) {
    const versionRaw = argonMatch[2];
    const memoryRaw = argonMatch[3];
    const timeCostRaw = argonMatch[4];
    const parallelismRaw = argonMatch[5];
    const saltBase64 = argonMatch[6];
    const hashBase64 = argonMatch[7];

    if (
      !versionRaw ||
      !memoryRaw ||
      !timeCostRaw ||
      !parallelismRaw ||
      !saltBase64 ||
      !hashBase64
    ) {
      throw new Error('Invalid Argon2id hash format.');
    }

    return {
      format: 'argon2id',
      version: Number.parseInt(versionRaw, 10),
      argon2id: {
        memoryKiB: Number.parseInt(memoryRaw, 10),
        timeCost: Number.parseInt(timeCostRaw, 10),
        parallelism: Number.parseInt(parallelismRaw, 10),
        outputLength: base64ByteLength(hashBase64),
      },
      saltBase64,
      hashBase64,
    };
  }

  const legacySeparator = hash.indexOf(':');
  if (legacySeparator > 0 && legacySeparator === hash.lastIndexOf(':')) {
    const salt = hash.slice(0, legacySeparator);
    const keyHex = hash.slice(legacySeparator + 1);
    return {
      format: 'legacy-scrypt',
      salt,
      keyHex,
    };
  }

  throw new Error('Unsupported password hash format.');
};

export const assessPasswordHash = (
  hash: string,
  targetPreset: HashPresetDefinition = STANDARD_2026Q1_PRESET,
): PasswordHashRehashAssessment => {
  const parsed = parseStoredPasswordHash(hash);
  if (parsed.format === 'legacy-scrypt') {
    return {
      parsed,
      needsRehash: true,
      reasons: ['legacy-scrypt-format'],
    };
  }

  const reasons: PasswordHashUpgradeReason[] = [];
  if (parsed.version !== ARGON2_VERSION) {
    reasons.push('argon2-version');
  }
  if (parsed.argon2id.memoryKiB < targetPreset.argon2id.memoryKiB) {
    reasons.push('argon2-memory');
  }
  if (parsed.argon2id.timeCost < targetPreset.argon2id.timeCost) {
    reasons.push('argon2-time-cost');
  }
  if (parsed.argon2id.parallelism < targetPreset.argon2id.parallelism) {
    reasons.push('argon2-parallelism');
  }
  if (parsed.argon2id.outputLength < targetPreset.argon2id.outputLength) {
    reasons.push('argon2-output-length');
  }

  return {
    parsed,
    needsRehash: reasons.length > 0,
    reasons,
  };
};

export const needsPasswordRehash = (
  hash: string,
  targetPreset: HashPresetDefinition = STANDARD_2026Q1_PRESET,
): boolean => assessPasswordHash(hash, targetPreset).needsRehash;
