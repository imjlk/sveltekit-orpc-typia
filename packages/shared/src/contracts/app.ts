import { oc, populateContractRouterPaths } from '@orpc/contract';
import { ROUTER_CONTRACTS } from './registry';

export const appContract = populateContractRouterPaths(
  oc.router({
    ...ROUTER_CONTRACTS,
  }),
);

export type AppContract = typeof appContract;
