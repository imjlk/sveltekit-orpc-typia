import { sveltekit } from '@sveltejs/kit/vite';
import UnpluginTypia from '@typia/unplugin/vite';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			'@repo/db/bun': path.resolve(__dirname, '../../packages/db/src/bun.ts'),
			'@repo/db/d1': path.resolve(__dirname, '../../packages/db/src/d1.ts'),
			'@repo/db/migrations': path.resolve(__dirname, '../../packages/db/src/migrations.ts')
		}
	},
	plugins: [
		UnpluginTypia(),
		sveltekit()
	]
});
