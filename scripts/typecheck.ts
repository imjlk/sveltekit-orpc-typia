const projects = [
  'packages/auth-hasher-contracts/tsconfig.json',
  'packages/auth-hasher-client/tsconfig.json',
  'packages/auth-hasher-better-auth-adapter/tsconfig.json',
  'packages/auth-hasher/tsconfig.json',
  'apps/api/tsconfig.json',
  'apps/auth-hasher-worker/tsconfig.json',
  'apps/worker-content/tsconfig.json',
  'apps/worker-meta/tsconfig.json',
  'apps/worker-edge-guard/tsconfig.json',
  'apps/worker-post-events/tsconfig.json',
  'apps/worker-og/tsconfig.json',
];

for (const project of projects) {
  console.log(`[typecheck] ${project}`);
  const proc = Bun.spawn({
    cmd: [process.execPath, 'node_modules/typescript/bin/tsc', '-p', project, '--noEmit'],
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
  const code = await proc.exited;
  if (code !== 0) {
    process.exit(code);
  }
}
