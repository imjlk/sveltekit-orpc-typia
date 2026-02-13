import { sveltekit } from '@sveltejs/kit/vite';
import UnpluginTypia from '@kennethwkz/unplugin-typia/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		UnpluginTypia(),
		sveltekit()
	]
});
