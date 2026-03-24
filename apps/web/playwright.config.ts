import { defineConfig, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const sharedDbPath =
	process.env.DATABASE_URL ??
	resolve(tmpdir(), `cloudflare-first-starter.e2e.${process.pid}.${Date.now()}.sqlite`);
const apiPort = Number(process.env.E2E_API_PORT ?? 3101);
const webPort = Number(process.env.E2E_WEB_PORT ?? 4173);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

mkdirSync(dirname(sharedDbPath), { recursive: true });

const databaseEnv = `DATABASE_URL=${JSON.stringify(sharedDbPath)}`;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	use: {
		headless: true,
		baseURL: webBaseUrl
	},
	webServer: [
		{
			command: `PORT=${apiPort} ${databaseEnv} bun ../../scripts/e2e-api.ts`,
			url: `${apiBaseUrl}/health`,
			reuseExistingServer: false,
			timeout: 120_000
		},
		{
			command: `ORPC_API_URL=${apiBaseUrl}/rpc ${databaseEnv} bun run dev -- --host 127.0.0.1 --port ${webPort}`,
			url: webBaseUrl,
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
