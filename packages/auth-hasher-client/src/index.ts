import {
  STANDARD_2026Q1_PRESET,
  assessPasswordHash,
  type AuthHasherBinding,
  type AuthHasherMetadata,
  type AuthHasherRpc,
  type HashPresetDefinition,
  type PasswordHashRehashAssessment,
  type PasswordHashUpgradeReason,
  FREE_TIER_FALLBACK_2026Q1_PRESET,
  STANDARD_RECOMMENDED_PRESET,
  isOwaspAlignedPreset,
  needsPasswordRehash,
  parseStoredPasswordHash,
} from '@repo/auth-hasher-contracts';

export {
  FREE_TIER_FALLBACK_2026Q1_PRESET,
  STANDARD_2026Q1_PRESET,
  STANDARD_RECOMMENDED_PRESET,
  assessPasswordHash,
  isOwaspAlignedPreset,
  needsPasswordRehash,
  parseStoredPasswordHash,
} from '@repo/auth-hasher-contracts';

export type {
  Argon2idConfig,
  AuthHasherBinding,
  AuthHasherBuildManifest,
  AuthHasherMetadata,
  AuthHasherRpc,
  AuthHasherRuntimeEnv,
  HashPresetDefinition,
  LegacyScryptConfig,
  ParsedPasswordHash,
  PasswordHashFormat,
  PasswordHashRehashAssessment,
  PasswordHashUpgradeReason,
} from '@repo/auth-hasher-contracts';

export const isLocalAuthHasherProxyError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error ?? '');

  return /couldn't find a local dev session/i.test(message);
};

const hasMethod = <T extends string>(value: unknown, method: T): value is Record<T, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  try {
    return typeof Reflect.get(value, method) === 'function';
  } catch (error) {
    if (isLocalAuthHasherProxyError(error)) {
      return false;
    }

    throw error;
  }
};

export const isAuthHasherBinding = (value: unknown): value is AuthHasherBinding =>
  hasMethod(value, 'hashPassword') && hasMethod(value, 'verifyPassword');

export const resolveAuthHasherBinding = (
  env: object | null | undefined,
  bindingName = 'AUTH_HASHER',
): AuthHasherBinding | null => {
  const value = (env as Record<string, unknown> | null | undefined)?.[bindingName];
  return isAuthHasherBinding(value) ? value : null;
};

export const ensureAuthHasherBinding = (
  env: object | null | undefined,
  bindingName = 'AUTH_HASHER',
): AuthHasherBinding => {
  const binding = resolveAuthHasherBinding(env, bindingName);
  if (!binding) {
    throw new Error(`Missing ${bindingName} service binding.`);
  }

  return binding;
};

const isArgon2idConfig = (value: unknown): value is AuthHasherMetadata['argon2id'] =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { memoryKiB?: unknown }).memoryKiB === 'number' &&
  typeof (value as { timeCost?: unknown }).timeCost === 'number' &&
  typeof (value as { parallelism?: unknown }).parallelism === 'number' &&
  typeof (value as { outputLength?: unknown }).outputLength === 'number';

export const isAuthHasherMetadata = (value: unknown): value is AuthHasherMetadata =>
  typeof value === 'object' &&
  value !== null &&
  (value as { algorithm?: unknown }).algorithm === 'argon2id' &&
  typeof (value as { version?: unknown }).version === 'string' &&
  typeof (value as { artifactSourceChecksum?: unknown }).artifactSourceChecksum === 'string' &&
  typeof (value as { preset?: unknown }).preset === 'string' &&
  isArgon2idConfig((value as { argon2id?: unknown }).argon2id) &&
  Array.isArray((value as { rpc?: unknown }).rpc) &&
  (value as { rpc?: unknown[] }).rpc?.[0] === 'hashPassword' &&
  (value as { rpc?: unknown[] }).rpc?.[1] === 'verifyPassword' &&
  typeof (value as { owaspAligned?: unknown }).owaspAligned === 'boolean';

export const readAuthHasherMetadata = async (
  binding: Pick<AuthHasherBinding, 'fetch'>,
): Promise<AuthHasherMetadata | null> => {
  if (typeof binding.fetch !== 'function') {
    return null;
  }

  const response = await binding.fetch(new Request('https://auth-hasher.internal/'));
  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return isAuthHasherMetadata(json) ? json : null;
};

export interface VerifyAndMaybeRehashContext {
  previousHash: string;
  reasons: PasswordHashUpgradeReason[];
  targetPreset: HashPresetDefinition;
}

export interface VerifyAndMaybeRehashOptions {
  targetPreset?: HashPresetDefinition;
  persistUpdatedHash?: (nextHash: string, context: VerifyAndMaybeRehashContext) => Promise<void> | void;
}

export interface VerifyAndMaybeRehashResult {
  verified: boolean;
  needsRehash: boolean;
  rehashed: boolean;
  updatedHash: string | null;
  reasons: PasswordHashUpgradeReason[];
}

const createTargetPresetMismatchError = (
  targetPreset: HashPresetDefinition,
  reasons: PasswordHashUpgradeReason[],
): Error =>
  new Error(
    `Hasher output does not satisfy target preset '${targetPreset.id}'. Remaining differences: ${reasons.join(', ')}.`,
  );

export const verifyAndMaybeRehash = async (
  hasher: AuthHasherRpc,
  storedHash: string,
  password: string,
  options: VerifyAndMaybeRehashOptions = {},
): Promise<VerifyAndMaybeRehashResult> => {
  const verified = await hasher.verifyPassword(storedHash, password);
  if (!verified) {
    return {
      verified: false,
      needsRehash: false,
      rehashed: false,
      updatedHash: null,
      reasons: [],
    };
  }

  const targetPreset = options.targetPreset ?? STANDARD_2026Q1_PRESET;
  const assessment = assessPasswordHash(storedHash, targetPreset);
  if (!assessment.needsRehash) {
    return {
      verified: true,
      needsRehash: false,
      rehashed: false,
      updatedHash: null,
      reasons: [],
    };
  }

  const updatedHash = await hasher.hashPassword(password);
  const updatedAssessment: PasswordHashRehashAssessment = assessPasswordHash(updatedHash, targetPreset);
  if (updatedAssessment.needsRehash) {
    throw createTargetPresetMismatchError(targetPreset, updatedAssessment.reasons);
  }

  await options.persistUpdatedHash?.(updatedHash, {
    previousHash: storedHash,
    reasons: assessment.reasons,
    targetPreset,
  });

  return {
    verified: true,
    needsRehash: true,
    rehashed: true,
    updatedHash,
    reasons: assessment.reasons,
  };
};
