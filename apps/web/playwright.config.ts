import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	use: {
		headless: true,
		baseURL: 'http://127.0.0.1:5173'
	},
	webServer: [
		{
			command: 'bun ../../scripts/e2e-api.ts',
			url: 'http://127.0.0.1:3001/health',
			reuseExistingServer: true,
			timeout: 120_000
		},
		{
			command: 'ORPC_API_URL=http://127.0.0.1:3001/rpc bun run dev -- --host 127.0.0.1 --port 5173',
			url: 'http://127.0.0.1:5173',
			reuseExistingServer: true,
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
