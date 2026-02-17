export { resolveUpstream, type ResolveUpstreamOptions } from './resolver';
export {
  isD1Database,
  isServiceBinding,
  isTruthy,
  normalizeUpstreamUrl,
  resolveNodeBaseUrl,
  resolveNodeEnv,
  resolvePlatformBinding,
  resolvePlatformEnv,
} from './utils';
export {
  DEFAULT_UPSTREAM_URL,
  type D1DatabaseLike,
  type GatewayKind,
  type NodeEnv,
  type PlatformLike,
  type ServiceBinding,
  type Upstream,
} from './types';
