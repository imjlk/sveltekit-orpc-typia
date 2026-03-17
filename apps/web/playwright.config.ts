import { defineConfig, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const sharedDbPath =
	process.env.DATABASE_URL ??
	resolve(tmpdir(), `cloudflare-first-starter.e2e.${process.pid}.${Date.now()}.sqlite`);

mkdirSync(dirname(sharedDbPath), { recursive: true });

const databaseEnv = `DATABASE_URL=${JSON.stringify(sharedDbPath)}`;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	use: {
		headless: true,
		baseURL: 'http://127.0.0.1:4173'
	},
	webServer: [
		{
			command: `PORT=3101 ${databaseEnv} bun ../../scripts/e2e-api.ts`,
			url: 'http://127.0.0.1:3101/health',
			reuseExistingServer: false,
			timeout: 120_000
		},
		{
			command: `ORPC_API_URL=http://127.0.0.1:3101/rpc ${databaseEnv} bun run dev -- --host 127.0.0.1 --port 4173`,
			url: 'http://127.0.0.1:4173',
			reuseExistingServer: false,
			timeout: 120_000
		}
	],
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
