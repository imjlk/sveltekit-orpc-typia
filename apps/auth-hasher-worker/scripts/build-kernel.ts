import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isOwaspAlignedPreset, resolveHasherPreset } from '@repo/auth-hasher-contracts';

const appRoot = resolve(import.meta.dir, '..');
const manifestPath = resolve(appRoot, 'Cargo.toml');
const builtWasmPath = resolve(
  appRoot,
  'target/wasm32-unknown-unknown/release/auth_hasher_rust_wasm_kernel.wasm',
);
const committedWasmPath = resolve(appRoot, 'src/rust-wasm-kernel.wasm');
const buildManifestPath = resolve(appRoot, 'src/rust-wasm-kernel.build.json');
const buildManifestInputs = [
  'Cargo.lock',
  'Cargo.toml',
  'package.json',
  'crates/hash-core/Cargo.toml',
  'crates/hash-core/src/lib.rs',
  'crates/rust-wasm-kernel/Cargo.toml',
  'crates/rust-wasm-kernel/src/lib.rs',
  'scripts/build-kernel.ts',
] as const;

const cargoAvailable = async (): Promise<boolean> => {
  try {
    await Bun.$`cargo --version`.quiet();
    return true;
  } catch {
    return false;
  }
};

const writeBuildManifest = async () => {
  const hash = createHash('sha256');
  for (const relativePath of buildManifestInputs) {
    const contents = await Bun.file(resolve(appRoot, relativePath)).bytes();
    hash.update(`${relativePath}\n`);
    hash.update(contents);
    hash.update('\n');
  }

  const artifactPreset = resolveHasherPreset(process.env);

  await Bun.write(
    buildManifestPath,
    `${JSON.stringify(
      {
        artifactPreset: artifactPreset.id,
        artifactArgon2id: artifactPreset.argon2id,
        artifactOwaspAligned: isOwaspAlignedPreset(artifactPreset),
        artifactSourceChecksum: hash.digest('hex'),
        generatedBy: 'bun run build:kernel',
        inputs: [...buildManifestInputs],
      },
      null,
      2,
    )}\n`,
  );
};

const main = async () => {
  if (await cargoAvailable()) {
    await Bun.$`cargo build --manifest-path ${manifestPath} -p auth-hasher-rust-wasm-kernel --target wasm32-unknown-unknown --release`;
    await Bun.write(committedWasmPath, Bun.file(builtWasmPath));
    await writeBuildManifest();
    return;
  }

  if (existsSync(committedWasmPath)) {
    await writeBuildManifest();
    console.warn('cargo was not found; using committed src/rust-wasm-kernel.wasm.');
    return;
  }

  throw new Error('cargo was not found and src/rust-wasm-kernel.wasm is missing.');
};

await main();
