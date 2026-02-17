import { DEFAULT_UPSTREAM_URL, type GatewayKind, type NodeEnv, type PlatformLike, type Upstream } from './types';
import {
  isTruthy,
  normalizeUpstreamUrl,
  resolveNodeBaseUrl,
  resolveNodeEnv,
  resolvePlatformBinding,
  resolvePlatformEnv,
} from './utils';

type ResolveUpstreamOptions = {
  platform?: PlatformLike;
  routerName?: string;
  nodeEnv?: NodeEnv;
};

export const resolveUpstream = (kind: GatewayKind, options: ResolveUpstreamOptions = {}): Upstream => {
  const env = resolvePlatformEnv(options.platform);
  const nodeEnv = options.nodeEnv ?? resolveNodeEnv();
  const upper = options.routerName?.toUpperCase();
  const inProcessEnabled = isTruthy(env?.ORPC_IN_PROCESS) || isTruthy(nodeEnv?.ORPC_IN_PROCESS);

  if (upper) {
    const binding = resolvePlatformBinding(env, `ORPC_${upper}`);
    if (binding) return { kind: 'binding', binding };

    const url = env?.[`ORPC_${upper}_URL`];
    if (typeof url === 'string') return { kind: 'url', url: normalizeUpstreamUrl(kind, url) };
  }

  const defaultBinding = resolvePlatformBinding(env, 'ORPC_DEFAULT') ?? resolvePlatformBinding(env, 'ORPC_API');
  if (defaultBinding) return { kind: 'binding', binding: defaultBinding };

  const configuredUrl =
    (typeof env?.ORPC_API_URL === 'string' ? env.ORPC_API_URL : undefined) ??
    (typeof env?.ORPC_DEFAULT_URL === 'string' ? env.ORPC_DEFAULT_URL : undefined) ??
    resolveNodeBaseUrl(nodeEnv);

  if (configuredUrl) {
    return { kind: 'url', url: normalizeUpstreamUrl(kind, configuredUrl) };
  }

  if (inProcessEnabled) {
    return { kind: 'local' };
  }

  return { kind: 'url', url: normalizeUpstreamUrl(kind, DEFAULT_UPSTREAM_URL[kind]) };
};

export type { ResolveUpstreamOptions };
