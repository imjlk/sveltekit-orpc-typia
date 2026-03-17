import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { applyLocalD1Migrations } from './_cf-d1-migrations';

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
const edgeGuardInspectorPort = Number(process.env.EDGE_GUARD_INSPECTOR_PORT ?? 9230);
const postEventsInspectorPort = Number(process.env.POST_EVENTS_INSPECTOR_PORT ?? 9231);
const authHasherInspectorPort = Number(process.env.AUTH_HASHER_INSPECTOR_PORT ?? 9233);
const pagesInspectorPort = Number(process.env.PAGES_INSPECTOR_PORT ?? 9232);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');
const pagesConfigDir = mkdtempSync(resolve(tmpdir(), 'cloudflare-first-starter.pages-services.'));

const log = (...args: unknown[]) => console.log('[dev:web:cf:services]', ...args);
const defaultBetterAuthSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-better-auth-secret-change-me';

const readTomlString = (tomlText: string, key: string): string | undefined => {
	const re = new RegExp(`^\\s*${key}\\s*=\\s*\"([^\"]+)\"\\s*$`, 'm');
	return tomlText.match(re)?.[1];
};

const readWranglerTomlInfo = (filePath: string) => {
	const text = readFileSync(filePath, 'utf8');
	const name = readTomlString(text, 'name');
	const databaseId = readTomlString(text, 'database_id');
	return { name, databaseId };
};

const upsertTomlVar = (tomlText: string, key: string, value: string): string => {
	const line = `${key} = "${value}"`;
	const re = new RegExp(`^\\s*${key}\\s*=\\s*"[^"]*"\\s*$`, 'm');
	if (re.test(tomlText)) {
		return tomlText.replace(re, line);
	}

	const varsIndex = tomlText.indexOf('[vars]');
	if (varsIndex === -1) {
		return `${tomlText.trimEnd()}\n\n[vars]\n${line}\n`;
	}

	const insertAt = tomlText.indexOf('\n', varsIndex);
	if (insertAt === -1) {
		return `${tomlText}\n${line}\n`;
	}

	return `${tomlText.slice(0, insertAt + 1)}${line}\n${tomlText.slice(insertAt + 1)}`;
};

const ensureSharedD1Config = (ids: Array<{ filePath: string; databaseId?: string }>) => {
	const present = ids.filter((v) => typeof v.databaseId === 'string') as Array<{ filePath: string; databaseId: string }>;
	if (present.length < 2) return;

	const unique = new Set(present.map((v) => v.databaseId));
	if (unique.size <= 1) return;

	const details = present.map((v) => `${v.filePath}: ${v.databaseId}`).join('\n');
	throw new Error(
		`D1 database_id mismatch across wrangler.toml files.\n\nAll apps must point to the same D1 to share local state:\n${details}`
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

	const webWranglerToml = resolve(root, 'apps/web/wrangler.toml');
	const postEventsWranglerToml = resolve(root, 'apps/worker-post-events/wrangler.toml');
	const edgeGuardWranglerToml = resolve(root, 'apps/worker-edge-guard/wrangler.toml');
	const authHasherWranglerToml = resolve(root, 'apps/auth-hasher-worker/wrangler.toml');

	const webInfo = readWranglerTomlInfo(webWranglerToml);
	const postEventsInfo = readWranglerTomlInfo(postEventsWranglerToml);
	const edgeGuardInfo = readWranglerTomlInfo(edgeGuardWranglerToml);
	const authHasherInfo = readWranglerTomlInfo(authHasherWranglerToml);

	ensureSharedD1Config([
		{ filePath: webWranglerToml, databaseId: webInfo.databaseId },
		{ filePath: postEventsWranglerToml, databaseId: postEventsInfo.databaseId }
	]);

  const edgeGuardWorkerName = edgeGuardInfo.name ?? 'cloudflare-first-starter-worker-edge-guard';
  const authHasherWorkerName = authHasherInfo.name ?? 'cloudflare-first-starter-auth-hasher';
  const pagesConfig = readFileSync(resolve(webCwd, 'wrangler.services.toml'), 'utf8');
  const pagesConfigWithAuth = upsertTomlVar(
    upsertTomlVar(pagesConfig, 'BETTER_AUTH_URL', `http://127.0.0.1:${port}`),
    'BETTER_AUTH_SECRET',
    defaultBetterAuthSecret,
  );
  writeFileSync(resolve(pagesConfigDir, 'wrangler.toml'), pagesConfigWithAuth);

  await run(['bun', 'run', '--cwd', webCwd, 'build'], root);
	await applyLocalD1Migrations({ webCwd, drizzleDir, persistDir, log });

	children.push(
		spawnPrefixed({
			name: 'worker:edge-guard',
			cwd: resolve(root, 'apps/worker-edge-guard'),
			cmd: [
				'bunx',
				'--silent',
				'wrangler',
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
			]
		})
	);

	children.push(
		spawnPrefixed({
			name: 'worker:post-events',
			cwd: resolve(root, 'apps/worker-post-events'),
			cmd: [
				'bunx',
				'--silent',
				'wrangler',
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
			]
		})
	);

	children.push(
		spawnPrefixed({
			name: 'worker:auth-hasher',
			cwd: resolve(root, 'apps/auth-hasher-worker'),
			cmd: [
				'bunx',
				'--silent',
				'wrangler',
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
			]
		})
	);

	children.push(
		spawnPrefixed({
			name: 'pages',
			cwd: pagesConfigDir,
			cmd: [
				'bunx',
				'--silent',
				'wrangler',
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
				`AUTH_HASHER=${authHasherWorkerName}`
			]
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
