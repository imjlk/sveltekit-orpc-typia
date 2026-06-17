import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { applyLocalD1Migrations } from './_cf-d1-migrations';
import { createWranglerCommand } from './_wrangler-cli';

type ProcSpec = {
	name: string;
	cmd: string[];
	cwd: string;
	env?: Record<string, string | undefined>;
};

const root = resolve(import.meta.dir, '..');

const port = Number(process.env.PORT ?? 5173);
const edgeGuardPort = Number(process.env.EDGE_GUARD_PORT ?? 8788);
const postEventsPort = Number(process.env.POST_EVENTS_PORT ?? 8789);
const authHasherPort = Number(process.env.AUTH_HASHER_PORT ?? 8790);
const ogWorkerPort = Number(process.env.OG_WORKER_PORT ?? 8791);
const edgeGuardInspectorPort = Number(process.env.EDGE_GUARD_INSPECTOR_PORT ?? 9230);
const postEventsInspectorPort = Number(process.env.POST_EVENTS_INSPECTOR_PORT ?? 9231);
const authHasherInspectorPort = Number(process.env.AUTH_HASHER_INSPECTOR_PORT ?? 9233);
const ogWorkerInspectorPort = Number(process.env.OG_WORKER_INSPECTOR_PORT ?? 9234);
const pagesInspectorPort = Number(process.env.PAGES_INSPECTOR_PORT ?? 9232);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');
const pagesConfigDir = mkdtempSync(resolve(tmpdir(), 'cloudflare-first-starter.pages-services.'));

const log = (...args: unknown[]) => console.log('[dev:web:cf:services]', ...args);
const defaultBetterAuthSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-better-auth-secret-change-me';

const readConfigString = (configText: string, key: string): string | undefined => {
	const re = new RegExp(`^\\s*"?${key}"?\\s*[:=]\\s*"([^"]+)"\\s*,?\\s*$`, 'm');
	return configText.match(re)?.[1];
};

const readWranglerConfigInfo = (filePath: string) => {
	const text = readFileSync(filePath, 'utf8');
	const name = readConfigString(text, 'name');
	const databaseId = readConfigString(text, 'database_id');
	return { name, databaseId };
};

const upsertJsoncVar = (jsoncText: string, key: string, value: string): string => {
	const line = `\t\t"${key}": ${JSON.stringify(value)},`;
	const existing = new RegExp(`^(\\s*)"${key}"\\s*:\\s*"[^"]*"(,?)\\s*$`, 'm');
	if (existing.test(jsoncText)) {
		return jsoncText.replace(existing, (_match, indent: string, comma: string) => {
			const trailingComma = comma || ',';
			return `${indent}"${key}": ${JSON.stringify(value)}${trailingComma}`;
		});
	}

	const varsIndex = jsoncText.indexOf('"vars"');
	if (varsIndex === -1) {
		const insertAt = jsoncText.lastIndexOf('}');
		if (insertAt === -1) {
			return jsoncText;
		}
		return `${jsoncText.slice(0, insertAt).trimEnd()},\n\t"vars": {\n${line}\n\t}\n${jsoncText.slice(insertAt)}`;
	}

	const openBraceIndex = jsoncText.indexOf('{', varsIndex);
	if (openBraceIndex === -1) {
		return jsoncText;
	}

	const insertAt = jsoncText.indexOf('\n', openBraceIndex);
	if (insertAt === -1) {
		return `${jsoncText.slice(0, openBraceIndex + 1)}\n${line}\n${jsoncText.slice(openBraceIndex + 1)}`;
	}

	return `${jsoncText.slice(0, insertAt + 1)}${line}\n${jsoncText.slice(insertAt + 1)}`;
};

const ensureSharedD1Config = (ids: Array<{ filePath: string; databaseId?: string }>) => {
	const present = ids.filter((v) => typeof v.databaseId === 'string') as Array<{ filePath: string; databaseId: string }>;
	if (present.length < 2) return;

	const unique = new Set(present.map((v) => v.databaseId));
	if (unique.size <= 1) return;

	const details = present.map((v) => `${v.filePath}: ${v.databaseId}`).join('\n');
	throw new Error(
		`D1 database_id mismatch across Wrangler config files.\n\nAll apps must point to the same D1 to share local state:\n${details}`
	);
};

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
		cwd: spec.cwd,
		stdout: 'pipe',
		stderr: 'pipe',
		env: spec.env ?? process.env
	});

	void pipeStream(spec.name, child.stdout);
	void pipeStream(spec.name, child.stderr);

	return child;
};

const run = async (cmd: string[], cwd: string) => {
	const child = Bun.spawn({
		cmd,
		cwd,
		stdout: 'inherit',
		stderr: 'inherit',
		env: process.env
	});
	const code = await child.exited;
	if (code !== 0) {
		throw new Error(`Command failed (${code}): ${cmd.join(' ')}`);
	}
};

const children: Array<ReturnType<typeof Bun.spawn>> = [];

const shutdown = () => {
  for (const child of children) {
		try {
			child.kill('SIGTERM');
		} catch {
      // ignore
    }
  }

  try {
    rmSync(pagesConfigDir, { recursive: true, force: true });
  } catch {
    // ignore
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
	log('persistDir:', persistDir);

	const webWranglerConfig = resolve(root, 'apps/web/wrangler.jsonc');
	const postEventsWranglerToml = resolve(root, 'apps/worker-post-events/wrangler.toml');
	const edgeGuardWranglerToml = resolve(root, 'apps/worker-edge-guard/wrangler.toml');
	const authHasherWranglerToml = resolve(root, 'apps/auth-hasher-worker/wrangler.toml');
	const ogWorkerWranglerToml = resolve(root, 'apps/worker-og/wrangler.toml');

	const webInfo = readWranglerConfigInfo(webWranglerConfig);
	const postEventsInfo = readWranglerConfigInfo(postEventsWranglerToml);
	const edgeGuardInfo = readWranglerConfigInfo(edgeGuardWranglerToml);
	const authHasherInfo = readWranglerConfigInfo(authHasherWranglerToml);
	const ogWorkerInfo = readWranglerConfigInfo(ogWorkerWranglerToml);

	ensureSharedD1Config([
		{ filePath: webWranglerConfig, databaseId: webInfo.databaseId },
		{ filePath: postEventsWranglerToml, databaseId: postEventsInfo.databaseId }
	]);

  const edgeGuardWorkerName = edgeGuardInfo.name ?? 'cloudflare-first-starter-worker-edge-guard';
  const authHasherWorkerName = authHasherInfo.name ?? 'cloudflare-first-starter-auth-hasher';
  const ogWorkerName = ogWorkerInfo.name ?? 'cloudflare-first-starter-worker-og';
  const pagesConfig = readFileSync(resolve(webCwd, 'wrangler.jsonc'), 'utf8');
  const pagesConfigWithAuth = upsertJsoncVar(
    upsertJsoncVar(
      upsertJsoncVar(
        upsertJsoncVar(pagesConfig, 'BETTER_AUTH_URL', `http://127.0.0.1:${port}`),
        'ORPC_DB_DRIVER',
        'd1',
      ),
      'BETTER_AUTH_SECRET',
      defaultBetterAuthSecret,
    ),
    'OG_WORKER_BASE_URL',
    `http://127.0.0.1:${ogWorkerPort}`,
  );
  writeFileSync(resolve(pagesConfigDir, 'wrangler.jsonc'), pagesConfigWithAuth);

  await run(['bun', 'run', '--cwd', webCwd, 'build'], root);
	await applyLocalD1Migrations({ webCwd, drizzleDir, persistDir, log });

	children.push(
		spawnPrefixed({
			name: 'worker:edge-guard',
			cwd: resolve(root, 'apps/worker-edge-guard'),
			cmd: createWranglerCommand([
				'dev',
				'--local',
				'--ip',
				'127.0.0.1',
				'--port',
				String(edgeGuardPort),
				'--persist-to',
				persistDir,
				'--inspector-port',
				String(edgeGuardInspectorPort),
				'--log-level',
				'warn'
			])
		})
	);

	children.push(
		spawnPrefixed({
			name: 'worker:post-events',
			cwd: resolve(root, 'apps/worker-post-events'),
			cmd: createWranglerCommand([
				'dev',
				'--local',
				'--ip',
				'127.0.0.1',
				'--port',
				String(postEventsPort),
				'--persist-to',
				persistDir,
				'--inspector-port',
				String(postEventsInspectorPort),
				'--log-level',
				'warn'
			])
		})
	);

	children.push(
		spawnPrefixed({
			name: 'worker:auth-hasher',
			cwd: resolve(root, 'apps/auth-hasher-worker'),
			cmd: createWranglerCommand([
				'dev',
				'--local',
				'--ip',
				'127.0.0.1',
				'--port',
				String(authHasherPort),
				'--persist-to',
				persistDir,
				'--inspector-port',
				String(authHasherInspectorPort),
				'--log-level',
				'warn'
			])
		})
	);

	children.push(
		spawnPrefixed({
			name: 'worker:og',
			cwd: resolve(root, 'apps/worker-og'),
			cmd: createWranglerCommand([
				'dev',
				'--local',
				'--ip',
				'127.0.0.1',
				'--port',
				String(ogWorkerPort),
				'--persist-to',
				persistDir,
				'--inspector-port',
				String(ogWorkerInspectorPort),
				'--log-level',
				'warn'
			])
		})
	);

	children.push(
		spawnPrefixed({
			name: 'pages',
			cwd: pagesConfigDir,
			cmd: createWranglerCommand([
				'pages',
				'dev',
				resolve(webCwd, '.svelte-kit/cloudflare'),
				'--ip',
				'127.0.0.1',
				'--port',
				String(port),
				'--persist-to',
				persistDir,
				'--inspector-port',
				String(pagesInspectorPort),
				'--log-level',
				'warn',
				'--service',
				`EDGE_GUARD=${edgeGuardWorkerName}`,
				'--service',
				`AUTH_HASHER=${authHasherWorkerName}`,
				'--service',
				`OG_WORKER=${ogWorkerName}`
			])
		})
	);

	await Promise.race(children.map((c) => c.exited));
	shutdown();
	process.exit(1);
} catch (err) {
	shutdown();
	console.error(err);
	process.exit(1);
}
