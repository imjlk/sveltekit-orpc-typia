import { badRequestDataSchema, notFoundDataSchema, rateLimitedDataSchema } from './schema';

export const commonErrors = {
  BAD_REQUEST: {
    status: 400,
    message: 'Bad Request',
    data: badRequestDataSchema,
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: 'Internal Server Error',
  },
} as const;

export const notFoundErrors = {
  NOT_FOUND: {
    status: 404,
    message: 'Not Found',
    data: notFoundDataSchema,
  },
} as const;

export const unauthorizedErrors = {
  UNAUTHORIZED: {
    status: 401,
    message: 'Unauthorized',
  },
} as const;

export const rateLimitedErrors = {
  TOO_MANY_REQUESTS: {
    status: 429,
    message: 'Too Many Requests',
    data: rateLimitedDataSchema,
  },
} as const;
