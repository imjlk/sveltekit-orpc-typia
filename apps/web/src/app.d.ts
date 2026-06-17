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

type BetterAuthLike = {
	api: {
		getSession(input: { headers: Headers }): Promise<unknown>;
	};
};

type PlatformEnv = Partial<Omit<Cloudflare.Env, 'AUTH_HASHER'>> & {
	ORPC_DB_BINDING?: string;
	BETTER_AUTH_SECRET?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	AUTH_HASHER_PRESET_ID?: string;
	AUTH_HASHER_ARGON2_MEMORY_KIB?: string;
	AUTH_HASHER_ARGON2_TIME_COST?: string;
	AUTH_HASHER_ARGON2_PARALLELISM?: string;
	AUTH_HASHER_ARGON2_OUTPUT_LENGTH?: string;
	AUTH_HASHER_ENABLE_METADATA_ROUTE?: string;
	AUTH_HASHER?: AuthHasherBinding;
	EDGE_GUARD?: EdgeGuardBinding;
	OG_WORKER?: Fetcher;
	POST_EVENTS?: Queue<PostEventMessage>;
	ORPC_DEFAULT?: Fetcher;
	ORPC_API?: Fetcher;
	ORPC_POST?: Fetcher;
	ORPC_COMMENT?: Fetcher;
	ORPC_CATEGORY?: Fetcher;
	ORPC_TAG?: Fetcher;
	KV?: KVNamespace;
	R2?: R2Bucket;
	APP_STATE?: DurableObjectNamespace;
	HYPERDRIVE?: Hyperdrive;
	OG_WORKER_BASE_URL?: string;
	[key: string]: unknown;
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
			env?: PlatformEnv;
		}
	}
}

export {};
