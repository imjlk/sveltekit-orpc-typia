import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://root:mysecretpassword@localhost:50101/local';

export default defineConfig({
  schema: './src/pg-schema.ts',
  out: './drizzle-pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
