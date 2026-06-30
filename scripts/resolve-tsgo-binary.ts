import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const platformPackageName = `@typescript/native-preview-${process.platform}-${process.arch}`;
const binaryName = process.platform === 'win32' ? 'tsgo.exe' : 'tsgo';

export const resolveNativePreviewTsgoBinary = (): string => {
	const requireFromHere = createRequire(import.meta.url);
	const nativePreviewPackageJson = requireFromHere.resolve('@typescript/native-preview/package.json');
	const requireFromNativePreview = createRequire(nativePreviewPackageJson);
	const platformPackageJson = requireFromNativePreview.resolve(`${platformPackageName}/package.json`);
	const binary = path.join(path.dirname(platformPackageJson), 'lib', binaryName);

	if (!existsSync(binary)) {
		throw new Error(`Missing TypeScript-Go native preview binary: ${binary}`);
	}

	return binary;
};

export const ensureNativePreviewTsgoBinary = (): string => {
	if (process.env.TTSC_TSGO_BINARY) {
		return process.env.TTSC_TSGO_BINARY;
	}

	const binary = resolveNativePreviewTsgoBinary();
	process.env.TTSC_TSGO_BINARY = binary;
	return binary;
};
