import adapter from '@sveltejs/adapter-cloudflare';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'@repo/api': path.resolve(projectDir, '../../packages/api/src/index.ts'),
			'@repo/api/*': path.resolve(projectDir, '../../packages/api/src/*'),
			'@repo/db': path.resolve(projectDir, '../../packages/db/src/index.ts'),
			'@repo/db/*': path.resolve(projectDir, '../../packages/db/src/*'),
			'@repo/gateway': path.resolve(projectDir, '../../packages/gateway/src/index.ts'),
			'@repo/gateway/*': path.resolve(projectDir, '../../packages/gateway/src/*')
		}
	}
};

export default config;
