import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

type ProcSpec = {
  name: string;
  cmd: string[];
};

const root = process.cwd();
const sharedDistEntry = `${root}/packages/shared/dist/index.js`;

const prefixLine = (name: string, line: string) => {
  const trimmed = line.replace(/\r?\n$/, '');
  if (!trimmed) return;
  process.stdout.write(`[${name}] ${trimmed}\n`);
};

const pipeStream = async (name: string, stream: ReadableStream<Uint8Array> | null) => {
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const idx = buf.indexOf('\n');
      if (idx === -1) break;
      const line = buf.slice(0, idx + 1);
      buf = buf.slice(idx + 1);
      prefixLine(name, line);
    }
  }

  if (buf) prefixLine(name, buf);
};

const spawnPrefixed = (spec: ProcSpec) => {
  const child = Bun.spawn({
    cmd: spec.cmd,
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });

  void pipeStream(spec.name, child.stdout);
  void pipeStream(spec.name, child.stderr);

  return child;
};

const waitForSharedDist = async () => {
  // tsup --watch does an initial build, but we still guard on the file existing
  // to avoid "Cannot find module dist/*" races in api/web startup.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (existsSync(sharedDistEntry)) return;
    await sleep(200);
  }

  throw new Error(`Timed out waiting for ${sharedDistEntry}`);
};

const specs: ProcSpec[] = [
  { name: 'shared', cmd: ['bun', 'run', '--cwd', 'packages/shared', 'dev'] },
];

const children: Array<ReturnType<typeof Bun.spawn>> = [];

const shutdown = () => {
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
};

process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(143);
});

try {
  for (const spec of specs) {
    children.push(spawnPrefixed(spec));
  }

  await waitForSharedDist();

  children.push(
    spawnPrefixed({ name: 'api', cmd: ['bun', 'run', '--cwd', 'apps/api', 'dev'] }),
  );
  children.push(
    spawnPrefixed({ name: 'web', cmd: ['bun', 'run', '--cwd', 'apps/web', 'dev'] }),
  );

  // Keep alive until a child exits.
  await Promise.race(children.map((c) => c.exited));
  shutdown();
  process.exit(1);
} catch (err) {
  shutdown();
  console.error(err);
  process.exit(1);
}

