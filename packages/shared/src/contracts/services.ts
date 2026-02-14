import { oc, populateContractRouterPaths } from '@orpc/contract';
import { pick, ROUTER_CONTRACTS, SERVICE_GROUPS } from './registry';

/**
 * Service-oriented contracts.
 *
 * Useful when splitting routers across multiple upstreams (e.g. Cloudflare Workers service bindings)
 * while keeping the client path shape stable under `/rpc/<router>/...`.
 */

export const postServiceContract = populateContractRouterPaths(
  oc.router({
    post: ROUTER_CONTRACTS.post,
  }),
);

export type PostServiceContract = typeof postServiceContract;

export const commentServiceContract = populateContractRouterPaths(
  oc.router({
    comment: ROUTER_CONTRACTS.comment,
  }),
);

export type CommentServiceContract = typeof commentServiceContract;

export const categoryServiceContract = populateContractRouterPaths(
  oc.router({
    category: ROUTER_CONTRACTS.category,
  }),
);

export type CategoryServiceContract = typeof categoryServiceContract;

export const tagServiceContract = populateContractRouterPaths(
  oc.router({
    tag: ROUTER_CONTRACTS.tag,
  }),
);

export const contentServiceContract = populateContractRouterPaths(
  oc.router({
    ...pick(ROUTER_CONTRACTS, SERVICE_GROUPS.content),
  }),
);

export type ContentServiceContract = typeof contentServiceContract;

export type TagServiceContract = typeof tagServiceContract;

export const metaServiceContract = populateContractRouterPaths(
  oc.router({
    ...pick(ROUTER_CONTRACTS, SERVICE_GROUPS.meta),
  }),
);

export type MetaServiceContract = typeof metaServiceContract;
