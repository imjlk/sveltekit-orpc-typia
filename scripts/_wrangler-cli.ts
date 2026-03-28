import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const wranglerCli = resolve(root, 'node_modules/wrangler/bin/wrangler.js');

const parseVersion = (value: string): number[] =>
	value
		.replace(/^v/, '')
		.split('.')
		.map((part) => Number.parseInt(part, 10) || 0);

const compareVersionsDesc = (left: string, right: string): number => {
	const a = parseVersion(left);
	const b = parseVersion(right);
	const length = Math.max(a.length, b.length);

	for (let index = 0; index < length; index += 1) {
		const diff = (b[index] ?? 0) - (a[index] ?? 0);
		if (diff !== 0) return diff;
	}

	return 0;
};

const resolveNodeBinary = (): string | null => {
	const explicit = process.env.NODE_BIN?.trim();
	if (explicit && existsSync(explicit)) return explicit;

	const directCandidates = ['/opt/homebrew/bin/node', '/usr/local/bin/node'];
	for (const candidate of directCandidates) {
		if (existsSync(candidate)) return candidate;
	}

	const nvmDir = resolve(homedir(), '.nvm/versions/node');
	if (!existsSync(nvmDir)) return null;

	const versions = readdirSync(nvmDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name.startsWith('v'))
		.map((entry) => entry.name)
		.sort(compareVersionsDesc);

	for (const version of versions) {
		const candidate = resolve(nvmDir, version, 'bin/node');
		if (existsSync(candidate)) return candidate;
	}

	const onPath = Bun.which('node');
	if (onPath && !onPath.includes('/private/tmp/bun-node-')) return onPath;

	return null;
};

export const createWranglerCommand = (args: string[]): string[] => {
	const nodeBin = resolveNodeBinary();
	if (!nodeBin) {
		throw new Error(
			'Unable to locate a Node.js runtime for Wrangler. Install Node.js or set NODE_BIN to a Node binary path.'
		);
	}

	if (!existsSync(wranglerCli)) {
		throw new Error(`Wrangler CLI not found at ${wranglerCli}. Run bun install first.`);
	}

	return [nodeBin, wranglerCli, ...args];
};
