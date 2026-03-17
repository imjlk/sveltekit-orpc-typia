/// <reference types="@cloudflare/workers-types" />

import type { AuthHasherBinding } from '@repo/auth-hasher-contracts';
import type {
	CheckPostCreateLimitInput,
	CheckPostCreateLimitResult,
	EdgeGuardMode,
	PostEventMessage
} from '@repo/shared';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
type EdgeGuardBinding = {
	checkPostCreateLimit(input: CheckPostCreateLimitInput): Promise<CheckPostCreateLimitResult>;
	getMode(): Promise<EdgeGuardMode>;
};

type HyperdriveBinding = {
	connectionString: string;
};

type BetterAuthLike = {
	api: {
		getSession(input: { headers: Headers }): Promise<unknown>;
	};
};

declare global {
	namespace App {
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		interface Locals {
			auth?: BetterAuthLike;
		}
		interface Platform {
			env?: {
				ORPC_IN_PROCESS?: string;
				ORPC_DB_BINDING?: string;
				BETTER_AUTH_SECRET?: string;
				BETTER_AUTH_URL?: string;
				GITHUB_CLIENT_ID?: string;
				GITHUB_CLIENT_SECRET?: string;
				AUTH_HASHER_PRESET_ID?: string;
				AUTH_HASHER_ARGON2_MEMORY_KIB?: string;
				AUTH_HASHER_ARGON2_TIME_COST?: string;
				AUTH_HASHER_ARGON2_PARALLELISM?: string;
				AUTH_HASHER_ARGON2_OUTPUT_LENGTH?: string;
				AUTH_HASHER_ENABLE_METADATA_ROUTE?: string;

				// Default D1 binding name (configurable via ORPC_DB_BINDING).
				DB?: D1Database;
				AUTH_HASHER?: AuthHasherBinding;
				EDGE_GUARD?: EdgeGuardBinding;
				POST_EVENTS?: Queue<PostEventMessage>;

				// Legacy router split reference bindings. Not used by the default template path.
				ORPC_DEFAULT?: Fetcher;
				ORPC_API?: Fetcher;
				ORPC_POST?: Fetcher;
				ORPC_COMMENT?: Fetcher;
				ORPC_CATEGORY?: Fetcher;
				ORPC_TAG?: Fetcher;

				// Documented extension bindings. Not used by default in v1.
				KV?: KVNamespace;
				R2?: R2Bucket;
				APP_STATE?: DurableObjectNamespace;
				HYPERDRIVE?: HyperdriveBinding;

				[key: string]: unknown;
			};
		}
	}
}

export {};
