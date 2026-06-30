import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dir, '..');
const routesRoot = path.join(appRoot, 'src/routes');
const outRoot = path.join(appRoot, '.svelte-kit/types/src/routes');

const sourcePatterns = ['src/routes/**/*.ts', 'src/routes/**/*.js', 'src/routes/**/*.svelte'];

const stub = `import type { Actions as KitActions, RequestHandler as KitRequestHandler, ServerLoad } from '@sveltejs/kit';

type RouteParams = Record<string, string>;
type ParentData = Record<string, any>;
type OutputData = Record<string, any> | void;

export type LayoutServerLoad = ServerLoad<RouteParams, ParentData, OutputData, any>;
export type PageServerLoad = ServerLoad<RouteParams, ParentData, OutputData, any>;
export type Actions = KitActions<RouteParams, OutputData, any>;
export type RequestHandler = KitRequestHandler<RouteParams, any>;
`;

const routeDirs = new Set<string>();

for (const pattern of sourcePatterns) {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd: appRoot, absolute: true, onlyFiles: true })) {
    const contents = await Bun.file(file).text();
    if (!contents.includes("'./$types'") && !contents.includes('"./$types"')) continue;
    routeDirs.add(path.dirname(file));
  }
}

for (const dir of [...routeDirs].sort()) {
  const relative = path.relative(routesRoot, dir);
  const outDir = path.join(outRoot, relative);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, '$types.d.ts'), stub);
}
