import { defineConfig } from 'drizzle-kit';

const accountId = process.env.CF_ACCOUNT_ID;
const databaseId = process.env.CF_D1_DATABASE_ID;
const token = process.env.CF_API_TOKEN;

if (!accountId || !databaseId || !token) {
  throw new Error('Missing CF_ACCOUNT_ID / CF_D1_DATABASE_ID / CF_API_TOKEN for D1 migrations.');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId,
    databaseId,
    token,
  },
});

