import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './pg-schema';

export type HyperdriveLike = {
  connectionString: string;
};

export type PostgresDbHandle = Awaited<ReturnType<typeof createPostgresDb>>;

export const createPostgresDb = async (connectionString: string) => {
  const client = postgres(connectionString, {
    fetch_types: false,
    max: 5,
    prepare: true,
  });

  return {
    db: drizzle(client, { schema }),
    schema,
    dispose: () => client.end(),
  };
};

export const createHyperdriveDb = (hyperdrive: HyperdriveLike) =>
  createPostgresDb(hyperdrive.connectionString);
