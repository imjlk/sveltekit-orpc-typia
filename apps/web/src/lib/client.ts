import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { postContract } from '@repo/shared';

const link = new RPCLink({
	url: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000/rpc',
});

export const client: ContractRouterClient<typeof postContract> = createORPCClient(link);
