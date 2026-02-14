import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { appContract } from '@repo/shared';

const rpcUrl =
	import.meta.env.VITE_API_URL ??
	(typeof window === 'undefined'
		? 'http://127.0.0.1:3000/rpc'
		: new URL('/rpc', window.location.origin).toString());

const link = new RPCLink({
	url: rpcUrl,
});

export const client: ContractRouterClient<typeof appContract> = createORPCClient(link);
