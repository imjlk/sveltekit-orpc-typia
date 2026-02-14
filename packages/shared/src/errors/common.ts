import { badRequestDataSchema, notFoundDataSchema } from './schema';

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

