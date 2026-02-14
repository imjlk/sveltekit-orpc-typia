import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { appContract } from '@repo/shared';
import type { RequestEvent } from '@sveltejs/kit';

type EventLike = Pick<RequestEvent, 'fetch' | 'url'>;

export const createServerRpcClient = (event: EventLike): ContractRouterClient<typeof appContract> => {
	const rpcUrl = new URL('/rpc', event.url).toString();

	return createORPCClient(
		new RPCLink({
			url: rpcUrl,
			fetch: event.fetch
		})
	);
};
