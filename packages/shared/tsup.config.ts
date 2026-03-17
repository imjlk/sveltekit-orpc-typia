import { defineConfig } from 'tsup';
import unpluginTypia from '@kennethwkz/unplugin-typia/esbuild';

export default defineConfig({
  entry: ['src/index.ts', 'src/modules/**/*.ts', 'src/contracts/**/*.ts', 'src/transport/*.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  esbuildPlugins: [unpluginTypia()],
  splitting: false,
  sourcemap: true,
});
