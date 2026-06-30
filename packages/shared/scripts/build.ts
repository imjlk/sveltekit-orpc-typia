import { rm } from 'node:fs/promises';
import path from 'node:path';
import { build, context, type BuildOptions } from 'esbuild';
import ttsc from '@ttsc/unplugin/esbuild';

const packageRoot = path.resolve(import.meta.dir, '..');
const repoRoot = path.resolve(packageRoot, '../..');
const srcDir = path.join(packageRoot, 'src');
const distDir = path.join(packageRoot, 'dist');
const watch = process.argv.includes('--watch');

const entryPatterns = [
  'src/index.ts',
  'src/contracts/**/*.ts',
  'src/modules/**/*.ts',
  'src/transport/*.ts',
];

const external = [
  '@orpc/*',
  '@repo/*',
  '@standard-schema/*',
  'typia',
  'typia/*',
];

const collectEntryPoints = async () => {
  const entries = new Set<string>();

  for (const pattern of entryPatterns) {
    const glob = new Bun.Glob(pattern);
    for await (const file of glob.scan({ cwd: packageRoot, absolute: true, onlyFiles: true })) {
      entries.add(file);
    }
  }

  return [...entries].sort();
};

const tscCommand = (extraArgs: string[] = []) => [
  process.execPath,
  path.join(repoRoot, 'node_modules/typescript/bin/tsc'),
  '-p',
  path.join(packageRoot, 'tsconfig.build.json'),
  ...extraArgs,
];

const runDeclarations = async () => {
  const proc = Bun.spawn({
    cmd: tscCommand(),
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`declaration build failed with exit code ${code}`);
  }
};

const createBuildOptions = async (): Promise<BuildOptions> => ({
  absWorkingDir: packageRoot,
  bundle: true,
  entryNames: '[dir]/[name]',
  entryPoints: await collectEntryPoints(),
  external,
  format: 'esm',
  logLevel: 'info',
  outbase: srcDir,
  outdir: distDir,
  platform: 'neutral',
  plugins: [ttsc()],
  sourcemap: true,
  target: 'esnext',
});

if (watch) {
  await rm(distDir, { recursive: true, force: true });

  const esbuildContext = await context(await createBuildOptions());
  await esbuildContext.watch();

  const declarations = Bun.spawn({
    cmd: tscCommand(['--watch', '--preserveWatchOutput']),
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });

  const shutdown = async () => {
    declarations.kill('SIGTERM');
    await esbuildContext.dispose();
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(130));
  });
  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(143));
  });

  console.log('[shared] watching dist');
  await declarations.exited;
  await esbuildContext.dispose();
} else {
  await rm(distDir, { recursive: true, force: true });
  await build(await createBuildOptions());
  await runDeclarations();
}
