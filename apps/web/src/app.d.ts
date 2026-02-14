/// <reference types="@cloudflare/workers-types" />

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				ORPC_IN_PROCESS?: string;
				ORPC_DB_BINDING?: string;

				// Default D1 binding name (configurable via ORPC_DB_BINDING).
				DB?: D1Database;

				// Future service binding support (router split deployments).
				ORPC_DEFAULT?: Fetcher;
				ORPC_API?: Fetcher;
				ORPC_POST?: Fetcher;
				ORPC_COMMENT?: Fetcher;
				ORPC_CATEGORY?: Fetcher;
				ORPC_TAG?: Fetcher;

				[key: string]: unknown;
			};
		}
	}
}

export {};
