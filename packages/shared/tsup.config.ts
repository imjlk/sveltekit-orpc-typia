import { defineConfig } from 'tsup';
import ttsc from '@ttsc/unplugin/esbuild';
import { ensureNativePreviewTsgoBinary } from '../../scripts/resolve-tsgo-binary';

ensureNativePreviewTsgoBinary();

export default defineConfig({
  entry: ['src/index.ts', 'src/modules/**/*.ts', 'src/contracts/**/*.ts', 'src/transport/*.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  esbuildPlugins: [ttsc()],
  splitting: false,
  sourcemap: true,
});
