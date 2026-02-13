import { defineConfig } from 'tsup';
import unpluginTypia from '@kennethwkz/unplugin-typia/esbuild';

export default defineConfig({
  entry: ['src/index.ts', 'src/modules/post/types.ts', 'src/modules/post/schema.ts', 'src/modules/post/contract.ts', 'src/modules/post/errors.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  esbuildPlugins: [unpluginTypia()],
  splitting: false,
  sourcemap: true,
});
