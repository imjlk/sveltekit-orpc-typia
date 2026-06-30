import { chmod } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '..');
const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
const graphPackageJson = requireFromRepo.resolve('@ttsc/graph/package.json');
const graphBin = path.join(path.dirname(graphPackageJson), 'lib/bin.js');

const resolveNativeGraphBinary = () => {
  if (process.env.TTSC_GRAPH_BINARY && path.isAbsolute(process.env.TTSC_GRAPH_BINARY)) {
    return process.env.TTSC_GRAPH_BINARY;
  }

  const exe = process.platform === 'win32' ? 'ttscgraph.exe' : 'ttscgraph';

  try {
    const ttscPackageJson = requireFromRepo.resolve('ttsc/package.json');
    const requireFromTtsc = createRequire(ttscPackageJson);
    return requireFromTtsc.resolve(`@ttsc/${process.platform}-${process.arch}/bin/${exe}`);
  } catch {
    return undefined;
  }
};

const nativeGraphBinary = resolveNativeGraphBinary();
if (nativeGraphBinary) {
  await chmod(nativeGraphBinary, 0o755).catch(() => undefined);
}

const child = Bun.spawn({
  cmd: [process.execPath, graphBin, ...process.argv.slice(2)],
  cwd: repoRoot,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    ...(nativeGraphBinary ? { TTSC_GRAPH_BINARY: nativeGraphBinary } : {}),
  },
});

process.exit(await child.exited);
