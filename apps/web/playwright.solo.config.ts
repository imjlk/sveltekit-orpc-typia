import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.E2E_WEB_PORT ?? 4173);
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    headless: true,
    baseURL: webBaseUrl,
  },
  webServer: {
    command: 'bun ../../scripts/e2e-web-solo.ts',
    url: webBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
