import { sveltekit } from '@sveltejs/kit/vite';
import ttsc from '@ttsc/unplugin/vite';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const sharedSourceDir = path.resolve(__dirname, '../../packages/shared/src');

const sharedTypiaPlugin = (): Plugin => {
	const plugin = ttsc() as Plugin;
	const transform = plugin.transform;
	const isSharedSource = (id: string) => {
		const file = path.normalize(id.split('?')[0] ?? '');
		return file.startsWith(`${sharedSourceDir}${path.sep}`);
	};

	return {
		...plugin,
		name: 'ttsc-shared-typia',
		configResolved: undefined,
		transform(code, id, options) {
			if (!isSharedSource(id) || transform === undefined) return null;
			if (typeof transform === 'function') {
				return transform.call(this, code, id, options);
			}
			return transform.handler.call(this, code, id, options);
		}
	};
};

export default defineConfig({
	resolve: {
		alias: {
			'@repo/db/bun': path.resolve(__dirname, '../../packages/db/src/bun.ts'),
			'@repo/db/d1': path.resolve(__dirname, '../../packages/db/src/d1.ts'),
			'@repo/db/migrations': path.resolve(__dirname, '../../packages/db/src/migrations.ts')
		}
	},
	plugins: [
		sharedTypiaPlugin(),
		sveltekit()
	]
});
