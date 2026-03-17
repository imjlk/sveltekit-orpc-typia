import { ORPCError } from '@orpc/server';
import type { BadRequestData, ErrorIssue, NotFoundData, RateLimitedData } from '@repo/shared';

const isTruthy = (value: unknown): boolean =>
  value === '1' || value === 'true' || value === 'TRUE' || value === 'yes' || value === 'YES';

const normalizePathSegment = (segment: unknown): string | number | undefined => {
  if (typeof segment === 'string' || typeof segment === 'number') return segment;

  if (typeof segment === 'bigint') return Number.isSafeInteger(Number(segment)) ? Number(segment) : segment.toString();

  if (segment && typeof segment === 'object' && 'key' in segment) {
    const key = (segment as { key?: unknown }).key;
    if (typeof key === 'string' || typeof key === 'number') return key;
    if (typeof key === 'bigint') return Number.isSafeInteger(Number(key)) ? Number(key) : key.toString();
    return key != null ? String(key) : undefined;
  }

  if (segment == null) return undefined;
  return String(segment);
};

const normalizeIssues = (issues: unknown[]): ErrorIssue[] =>
  issues
    .map((issue) => {
      const msg = (issue as { message?: unknown } | null)?.message;
      const message = typeof msg === 'string' ? msg : 'Invalid value';

      const rawPath = (issue as { path?: unknown } | null)?.path;
      const path = Array.isArray(rawPath)
        ? rawPath.map(normalizePathSegment).filter((v): v is string | number => v !== undefined)
        : undefined;

      return path && path.length > 0 ? { message, path } : { message };
    })
    .filter((i) => !!i.message);

export const badRequest = (message: string, data: BadRequestData = {}): ORPCError<'BAD_REQUEST', BadRequestData> =>
  new ORPCError('BAD_REQUEST', { message, data });

export const notFound = (
  resource: string,
  id?: number,
  message = 'Not Found',
): ORPCError<'NOT_FOUND', NotFoundData> =>
  new ORPCError('NOT_FOUND', { message, data: { resource, id } });

export const unauthorized = (message = 'Unauthorized'): ORPCError<'UNAUTHORIZED', undefined> =>
  new ORPCError('UNAUTHORIZED', { message });

export const rateLimited = (
  message = 'Too Many Requests',
  data: RateLimitedData,
): ORPCError<'TOO_MANY_REQUESTS', RateLimitedData> => new ORPCError('TOO_MANY_REQUESTS', { message, data });

export const internalError = (
  message = 'Internal Server Error',
  cause?: unknown,
): ORPCError<'INTERNAL_SERVER_ERROR', undefined> => new ORPCError('INTERNAL_SERVER_ERROR', { message, cause });

/**
 * Normalizes oRPC validation issues into a stable JSON transport shape:
 * - StandardSchemaV1 path segments can contain `{ key: ... }` objects; we flatten them.
 */
export const normalizeOrpcErrorForTransport = (error: unknown) => {
  if (!(error instanceof ORPCError)) return error;
  if (error.code !== 'BAD_REQUEST') return error;

  const data = error.data as unknown;
  if (!data || typeof data !== 'object') return error;

  const issues = (data as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return error;

  const normalized: BadRequestData = {
    ...(data as BadRequestData),
    reason: (data as BadRequestData).reason ?? error.message,
    issues: normalizeIssues(issues),
  };

  // Keep the original "defined" bit and status as-is.
  return new ORPCError('BAD_REQUEST', {
    defined: error.defined,
    status: error.status,
    message: error.message,
    data: normalized,
    cause: error.cause,
  });
};

// Handy for Workers env-style vars too.
export const isDebugEnabled = (value: unknown) => isTruthy(value);
