import { resolveAuthHasherBinding, type AuthHasherBinding } from '@repo/auth-hasher-client';

export interface BetterAuthFallback {
  hashPassword(password: string): Promise<string>;
  verifyPassword(hash: string, password: string): Promise<boolean>;
}

export interface BetterAuthCloudflareEvent {
  platform?: {
    env?: object;
  };
}

export interface BetterAuthHasher {
  hash(password: string): Promise<string>;
  verify(data: { hash: string; password: string }): Promise<boolean>;
}

export interface BetterAuthAdapterOptions {
  bindingName?: string;
  fallback: BetterAuthFallback;
  allowMissingBinding?: boolean;
  missingBindingMessage?: string;
  shouldFallbackOnError?: (error: unknown) => boolean;
}

const defaultMissingBindingMessage = (bindingName: string): string =>
  `Missing ${bindingName} service binding.`;

export const resolveAuthPasswordHasherBinding = (
  event: BetterAuthCloudflareEvent,
  options: Omit<BetterAuthAdapterOptions, 'fallback'> & { fallback?: BetterAuthFallback } = {},
): AuthHasherBinding | null => {
  const bindingName = options.bindingName ?? 'AUTH_HASHER';
  const binding = resolveAuthHasherBinding(event.platform?.env, bindingName);
  if (binding) {
    return binding;
  }

  if (options.allowMissingBinding) {
    return null;
  }

  if (event.platform?.env) {
    throw new Error(options.missingBindingMessage ?? defaultMissingBindingMessage(bindingName));
  }

  return null;
};

export const createAuthPasswordHasher = (
  event: BetterAuthCloudflareEvent,
  options: BetterAuthAdapterOptions,
): BetterAuthHasher => {
  const binding = resolveAuthPasswordHasherBinding(event, options);
  if (!binding) {
    return {
      hash: (password) => options.fallback.hashPassword(password),
      verify: ({ hash, password }) => options.fallback.verifyPassword(hash, password),
    };
  }

  return {
    hash: async (password) => {
      try {
        return await binding.hashPassword(password);
      } catch (error) {
        if (options.shouldFallbackOnError?.(error)) {
          return options.fallback.hashPassword(password);
        }

        throw error;
      }
    },
    verify: async ({ hash, password }) => {
      try {
        return await binding.verifyPassword(hash, password);
      } catch (error) {
        if (options.shouldFallbackOnError?.(error)) {
          return options.fallback.verifyPassword(hash, password);
        }

        throw error;
      }
    },
  };
};
