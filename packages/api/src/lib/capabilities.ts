import type {
  CheckPostCreateLimitInput,
  CheckPostCreateLimitResult,
  EdgeGuardMode,
  PostEventMessage,
} from '@repo/shared';

export type EdgeGuardBinding = {
  checkPostCreateLimit(input: CheckPostCreateLimitInput): Promise<CheckPostCreateLimitResult>;
  getMode(): Promise<EdgeGuardMode>;
};

export type QueueLike<T> = {
  send(message: T, options?: { contentType?: 'text' | 'bytes' | 'json' | 'v8'; delaySeconds?: number }): Promise<void>;
};

const getRecordValue = (env: Record<string, unknown> | undefined, key: string): unknown => env?.[key];

const hasMethod = <T extends string>(value: unknown, method: T): value is Record<T, unknown> => {
  if (!value || typeof value !== 'object') return false;
  return typeof Reflect.get(value, method) === 'function';
};

export const resolveEdgeGuardBinding = (env: Record<string, unknown> | undefined): EdgeGuardBinding | null => {
  const value = getRecordValue(env, 'EDGE_GUARD');
  if (value == null) return null;

  if (!hasMethod(value, 'checkPostCreateLimit') || !hasMethod(value, 'getMode')) {
    throw new Error('Invalid EDGE_GUARD binding. Expected checkPostCreateLimit() and getMode() methods.');
  }

  return value as EdgeGuardBinding;
};

export const resolvePostEventsQueue = (env: Record<string, unknown> | undefined): QueueLike<PostEventMessage> | null => {
  const value = getRecordValue(env, 'POST_EVENTS');
  if (value == null) return null;

  if (!hasMethod(value, 'send')) {
    throw new Error('Invalid POST_EVENTS binding. Expected a Queue-like binding with send().');
  }

  return value as QueueLike<PostEventMessage>;
};

export const resolveClientIp = (request: Request): string | null => {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim().length > 0) {
    return cfConnectingIp.trim();
  }

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const [first] = xForwardedFor.split(',');
    if (first && first.trim().length > 0) {
      return first.trim();
    }
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp && xRealIp.trim().length > 0) {
    return xRealIp.trim();
  }

  return null;
};
