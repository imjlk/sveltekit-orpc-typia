import { resolveEdgeGuardBinding, resolvePostEventsQueue } from './capabilities';
import { hasAuthBridgeHeaders, resolveAuthBridgeSecret, verifyAuthBridgeHeaders } from '@repo/shared';
import type { AppContext } from '../types';

type CreateApiContextOptions = {
  allowDevFallback?: boolean;
  env?: Record<string, unknown>;
};

export const createApiContext = async (
  request: Request,
  options: CreateApiContextOptions = {},
): Promise<AppContext> => {
  const edgeGuard = resolveEdgeGuardBinding(options.env);
  const postEvents = resolvePostEventsQueue(options.env);

  if (!hasAuthBridgeHeaders(request.headers)) {
    return {
      auth: null,
      request,
      edgeGuard,
      postEvents,
    };
  }

  const secret = resolveAuthBridgeSecret(options.env, { allowDevFallback: options.allowDevFallback });
  const userId = await verifyAuthBridgeHeaders(request.headers, secret);

  return {
    auth: userId ? { userId } : null,
    request,
    edgeGuard,
    postEvents,
  };
};

export type { CreateApiContextOptions };
