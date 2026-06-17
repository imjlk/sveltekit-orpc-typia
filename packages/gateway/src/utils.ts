import type { D1DatabaseLike, GatewayKind, HyperdriveLike, NodeEnv, PlatformLike, ServiceBinding } from './types';

export const normalizeUpstreamUrl = (kind: GatewayKind, value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');

  if (kind === 'rpc') {
    return trimmed.endsWith('/rpc') ? trimmed : `${trimmed}/rpc`;
  }

  if (trimmed.endsWith('/api')) return trimmed;
  if (trimmed.endsWith('/rpc')) return `${trimmed.slice(0, -4)}/api`;
  return `${trimmed}/api`;
};

export const isServiceBinding = (value: unknown): value is ServiceBinding =>
  !!value && typeof value === 'object' && 'fetch' in value && typeof (value as { fetch?: unknown }).fetch === 'function';

export const isD1Database = (value: unknown): value is D1DatabaseLike =>
  !!value && typeof value === 'object' && 'prepare' in value && typeof (value as { prepare?: unknown }).prepare === 'function';

export const isHyperdrive = (value: unknown): value is HyperdriveLike =>
  !!value &&
  typeof value === 'object' &&
  'connectionString' in value &&
  typeof (value as { connectionString?: unknown }).connectionString === 'string';

export const resolvePlatformEnv = (platform: PlatformLike | undefined): Record<string, unknown> | undefined => platform?.env;

export const resolveNodeEnv = (): NodeEnv | undefined =>
  (globalThis as { process?: { env?: NodeEnv } }).process?.env;

export const isTruthy = (value: unknown): boolean =>
  value === '1' || value === 'true' || value === 'TRUE' || value === 'yes' || value === 'YES';

export const resolvePlatformBinding = (env: Record<string, unknown> | undefined, key: string): ServiceBinding | undefined => {
  const direct = env?.[key];
  if (isServiceBinding(direct)) return direct;

  const bindingName = env?.[`${key}_BINDING`];
  if (typeof bindingName !== 'string') return undefined;

  const indirect = env?.[bindingName];
  return isServiceBinding(indirect) ? indirect : undefined;
};

export const resolveNodeBaseUrl = (nodeEnv?: NodeEnv): string | undefined => nodeEnv?.ORPC_API_URL ?? nodeEnv?.VITE_API_URL;
