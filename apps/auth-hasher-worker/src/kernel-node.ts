import { readFile } from 'node:fs/promises';

interface RustKernelExports {
  memory: WebAssembly.Memory;
  alloc(length: number): number;
  dealloc(pointer: number, length: number): void;
  hash_password(passwordPointer: number, passwordLength: number, saltPointer: number, saltLength: number): number;
  verify_password(hashPointer: number, hashLength: number, passwordPointer: number, passwordLength: number): number;
  output_ptr(): number;
  output_len(): number;
  error_ptr(): number;
  error_len(): number;
  clear_buffers(): void;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const saltLength = 16;

let kernelPromise: Promise<RustKernelExports> | undefined;

const getKernel = (): Promise<RustKernelExports> => {
  if (!kernelPromise) {
    kernelPromise = readFile(new URL('./rust-wasm-kernel.wasm', import.meta.url))
      .then((bytes) => WebAssembly.instantiate(bytes, {}))
      .then((result) => {
        const instance =
          result instanceof WebAssembly.Instance
            ? result
            : (result as WebAssembly.WebAssemblyInstantiatedSource).instance;
        return instance.exports as unknown as RustKernelExports;
      });
  }

  return kernelPromise;
};

const writeBytes = (exports: RustKernelExports, bytes: Uint8Array): { pointer: number; length: number } => {
  const pointer = exports.alloc(bytes.length);
  if (bytes.length > 0) {
    new Uint8Array(exports.memory.buffer, pointer, bytes.length).set(bytes);
  }

  return { pointer, length: bytes.length };
};

const writeString = (exports: RustKernelExports, value: string): { pointer: number; length: number } =>
  writeBytes(exports, encoder.encode(value));

const readString = (exports: RustKernelExports, pointer: number, length: number): string =>
  decoder.decode(Uint8Array.from(new Uint8Array(exports.memory.buffer, pointer, length)));

const readError = (exports: RustKernelExports): Error => {
  const message = readString(exports, exports.error_ptr(), exports.error_len()) || 'Rust Wasm kernel failed.';
  return new Error(message);
};

export const hashPassword = async (password: string): Promise<string> => {
  const exports = await getKernel();
  const passwordBuffer = writeString(exports, password);
  const saltBuffer = writeBytes(exports, crypto.getRandomValues(new Uint8Array(saltLength)));

  try {
    const status = exports.hash_password(
      passwordBuffer.pointer,
      passwordBuffer.length,
      saltBuffer.pointer,
      saltBuffer.length,
    );

    if (status !== 1) {
      throw readError(exports);
    }

    return readString(exports, exports.output_ptr(), exports.output_len());
  } finally {
    exports.dealloc(passwordBuffer.pointer, passwordBuffer.length);
    exports.dealloc(saltBuffer.pointer, saltBuffer.length);
    exports.clear_buffers();
  }
};

export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  const exports = await getKernel();
  const hashBuffer = writeString(exports, hash);
  const passwordBuffer = writeString(exports, password);

  try {
    const status = exports.verify_password(
      hashBuffer.pointer,
      hashBuffer.length,
      passwordBuffer.pointer,
      passwordBuffer.length,
    );

    if (status === 2) {
      throw readError(exports);
    }

    return status === 1;
  } finally {
    exports.dealloc(hashBuffer.pointer, hashBuffer.length);
    exports.dealloc(passwordBuffer.pointer, passwordBuffer.length);
    exports.clear_buffers();
  }
};
