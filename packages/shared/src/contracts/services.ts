import { oc, populateContractRouterPaths } from '@orpc/contract';
import { categoryContract } from '../modules/category/contract';
import { commentContract } from '../modules/comment/contract';
import { postContract } from '../modules/post/contract';
import { tagContract } from '../modules/tag/contract';

/**
 * Service-oriented contracts.
 *
 * Useful when splitting routers across multiple upstreams (e.g. Cloudflare Workers service bindings)
 * while keeping the client path shape stable under `/rpc/<router>/...`.
 */

export const postServiceContract = populateContractRouterPaths(
  oc.router({
    post: postContract,
  }),
);

export type PostServiceContract = typeof postServiceContract;

export const commentServiceContract = populateContractRouterPaths(
  oc.router({
    comment: commentContract,
  }),
);

export type CommentServiceContract = typeof commentServiceContract;

export const categoryServiceContract = populateContractRouterPaths(
  oc.router({
    category: categoryContract,
  }),
);

export type CategoryServiceContract = typeof categoryServiceContract;

export const tagServiceContract = populateContractRouterPaths(
  oc.router({
    tag: tagContract,
  }),
);

export type TagServiceContract = typeof tagServiceContract;

export const metaServiceContract = populateContractRouterPaths(
  oc.router({
    category: categoryContract,
    tag: tagContract,
  }),
);

export type MetaServiceContract = typeof metaServiceContract;
