export type GatewayKind = 'rpc' | 'api';

export const DEFAULT_UPSTREAM_URL: Record<GatewayKind, string> = {
  rpc: 'http://127.0.0.1:3000/rpc',
  api: 'http://127.0.0.1:3000/api',
};

export type ServiceBinding = {
  fetch: (request: Request) => Promise<Response>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => unknown;
};

export type Upstream =
  | { kind: 'binding'; binding: ServiceBinding }
  | { kind: 'url'; url: string }
  | { kind: 'local' };

export type PlatformLike = {
  env?: Record<string, unknown>;
} | null;

export type NodeEnv = Record<string, string | undefined>;
