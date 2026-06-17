import * as sqliteSchema from '@repo/db/schema';
import type { DbRuntime, DbRuntimeInput, SelectQueryLike } from '../types';

export const toDbRuntime = (input: DbRuntimeInput): DbRuntime => {
  if (
    input &&
    typeof input === 'object' &&
    'db' in input &&
    'schema' in input &&
    (input as Partial<DbRuntime>).db
  ) {
    return input as DbRuntime;
  }

  return {
    db: input,
    schema: sqliteSchema,
  };
};

export const resolveSelect = async <T>(query: Promise<T> | SelectQueryLike<T>): Promise<T> => {
  if (query && typeof query === 'object' && 'all' in query && typeof query.all === 'function') {
    return query.all();
  }

  return query as Promise<T>;
};
