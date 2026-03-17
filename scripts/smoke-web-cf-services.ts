import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { applyLocalD1Migrations } from './_cf-d1-migrations';

const root = resolve(import.meta.dir, '..');

const port = Number(process.env.PORT ?? 5273);
const edgeGuardPort = Number(process.env.EDGE_GUARD_PORT ?? 8888);
const postEventsPort = Number(process.env.POST_EVENTS_PORT ?? 8889);
const authHasherPort = Number(process.env.AUTH_HASHER_PORT ?? 8890);
const edgeGuardInspectorPort = Number(process.env.EDGE_GUARD_INSPECTOR_PORT ?? 9330);
const postEventsInspectorPort = Number(process.env.POST_EVENTS_INSPECTOR_PORT ?? 9331);
const authHasherInspectorPort = Number(process.env.AUTH_HASHER_INSPECTOR_PORT ?? 9333);
const pagesInspectorPort = Number(process.env.PAGES_INSPECTOR_PORT ?? 9332);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');
const persistDir = mkdtempSync(resolve(tmpdir(), 'cloudflare-first-starter.cf-services.'));
const pagesConfigDir = mkdtempSync(resolve(tmpdir(), 'cloudflare-first-starter.pages-services.'));

const edgeGuardWorkerCwd = resolve(root, 'apps/worker-edge-guard');
const postEventsWorkerCwd = resolve(root, 'apps/worker-post-events');
const authHasherWorkerCwd = resolve(root, 'apps/auth-hasher-worker');
const edgeGuardWorkerName = 'cloudflare-first-starter-worker-edge-guard';
const authHasherWorkerName = 'cloudflare-first-starter-auth-hasher';
const defaultBetterAuthSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-better-auth-secret-change-me';

const log = (...args: unknown[]) => console.log('[smoke:web:cf:services]', ...args);

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

const waitFor = async (label: string, fn: () => Promise<boolean>) => {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		try {
			if (await fn()) return;
		} catch {
			// ignore
		}
		await sleep(300);
	}
	throw new Error(`Timed out waiting for ${label}`);
};

const spawn = (name: string, cmd: string[], cwd: string) => {
	const child = Bun.spawn({
		cmd,
		cwd,
		stdout: 'inherit',
		stderr: 'inherit',
		env: process.env
	});
	log('spawn:', name, cmd.join(' '));
	return child;
};

const kill = async (child: ReturnType<typeof Bun.spawn> | null) => {
	if (!child) return;
	try {
		child.kill('SIGTERM');
	} catch {
		// ignore
	}
	try {
		await child.exited;
	} catch {
		// ignore
	}
};

const getSetCookieHeaders = (response: Response): string[] => {
	const getSetCookie = Reflect.get(response.headers, 'getSetCookie');
	if (typeof getSetCookie === 'function') {
		const values = getSetCookie.call(response.headers);
		if (Array.isArray(values)) {
			return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
		}
	}

	const setCookie = response.headers.get('set-cookie');
	return typeof setCookie === 'string' && setCookie.length > 0 ? setCookie.split(/,(?=[^;]+=[^;]+)/g) : [];
};

const toCookieHeader = (response: Response): string => {
	return getSetCookieHeaders(response)
		.map((header) => header.split(';', 1)[0]?.trim() ?? '')
		.filter((value) => value.length > 0)
		.join('; ');
};

const signUpAndGetCookie = async (base: string): Promise<string> => {
	const uniqueSuffix = Date.now().toString(36);
	const email = `cf-services-${uniqueSuffix}@example.com`;

	const response = await fetch(`${base}/auth/sign-up/email`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			origin: base,
			referer: `${base}/auth/sign-up?next=%2Fposts`
		},
		body: JSON.stringify({
			name: 'Smoke User',
			email,
			password: 'password1234'
		})
	});

	if (!response.ok) {
		throw new Error(`Sign-up failed (${response.status}): ${await response.text()}`);
	}

	const cookieHeader = toCookieHeader(response);
	if (!cookieHeader) {
		throw new Error('Sign-up did not return auth cookies.');
	}

	return cookieHeader;
};

const createPost = async (base: string, cookie: string, index: number): Promise<Response> =>
	fetch(`${base}/api/post/create`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie
		},
		body: JSON.stringify({
			title: `Smoke Post ${index}`,
			content: `Capability example smoke run ${index}`
		})
	});

const listActivity = async (base: string, cookie: string): Promise<unknown> => {
	const response = await fetch(`${base}/api/post/listActivity`, {
		method: 'GET',
		headers: { cookie }
	});
	if (!response.ok) {
		throw new Error(`listActivity failed (${response.status}): ${await response.text()}`);
	}
	return response.json();
};

try {
	log('persistDir:', persistDir);

	{
		const child = spawn('web:build', ['bun', 'run', '--cwd', webCwd, 'build'], root);
		const code = await child.exited;
		if (code !== 0) throw new Error(`web build failed (${code})`);
	}

	await applyLocalD1Migrations({ webCwd, drizzleDir, persistDir, log });
	const pagesConfig = readFileSync(resolve(webCwd, 'wrangler.services.toml'), 'utf8');
	const pagesConfigWithAuth = upsertTomlVar(
		upsertTomlVar(pagesConfig, 'BETTER_AUTH_URL', `http://127.0.0.1:${port}`),
		'BETTER_AUTH_SECRET',
		defaultBetterAuthSecret
	);
	writeFileSync(resolve(pagesConfigDir, 'wrangler.toml'), pagesConfigWithAuth);

	const edgeGuardWorker = spawn(
		'worker:edge-guard',
		[
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
		],
		edgeGuardWorkerCwd
	);

	const postEventsWorker = spawn(
		'worker:post-events',
		[
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
		],
		postEventsWorkerCwd
	);

	const authHasherWorker = spawn(
		'worker:auth-hasher',
		[
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
		],
		authHasherWorkerCwd
	);

	const pages = spawn(
		'pages',
		[
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
		],
		pagesConfigDir
	);

	try {
		const base = `http://127.0.0.1:${port}`;

		await waitFor('/ responds', async () => {
			const response = await fetch(base);
			return response.ok;
		});

		const cookie = await signUpAndGetCookie(base);

		for (let index = 1; index <= 5; index += 1) {
			const response = await createPost(base, cookie, index);
			if (!response.ok) {
				throw new Error(`Expected create post ${index} to succeed, got ${response.status}: ${await response.text()}`);
			}
		}

		const limited = await createPost(base, cookie, 6);
		if (limited.status !== 429) {
			throw new Error(`Expected sixth post create to be rate limited, got ${limited.status}: ${await limited.text()}`);
		}

		await waitFor('POST_EVENTS consumer projects async activity', async () => {
			const json = await listActivity(base, cookie);
			return Array.isArray(json) && json.length > 0;
		});

		log('OK');
	} finally {
		await kill(pages);
		await kill(authHasherWorker);
		await kill(postEventsWorker);
		await kill(edgeGuardWorker);
	}

	process.exit(0);
} catch (err) {
	console.error(err);
	process.exitCode = 1;
} finally {
	if (!process.env.KEEP_CF_STATE) {
		try {
			rmSync(persistDir, { recursive: true, force: true });
		} catch {
			// ignore
		}
		try {
			rmSync(pagesConfigDir, { recursive: true, force: true });
		} catch {
			// ignore
		}
	} else {
		log('KEEP_CF_STATE=1: not deleting', persistDir);
		log('KEEP_CF_STATE=1: not deleting', pagesConfigDir);
	}
}
