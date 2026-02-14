import { ORPCError } from '@orpc/server';
import type { BadRequestData, NotFoundData } from '@repo/shared';

export const badRequest = (message: string, data: BadRequestData = {}): ORPCError<'BAD_REQUEST', BadRequestData> =>
  new ORPCError('BAD_REQUEST', { message, data });

export const notFound = (
  resource: string,
  id?: number,
  message = 'Not Found',
): ORPCError<'NOT_FOUND', NotFoundData> =>
  new ORPCError('NOT_FOUND', { message, data: { resource, id } });

export const internalError = (
  message = 'Internal Server Error',
  cause?: unknown,
): ORPCError<'INTERNAL_SERVER_ERROR', undefined> => new ORPCError('INTERNAL_SERVER_ERROR', { message, cause });

