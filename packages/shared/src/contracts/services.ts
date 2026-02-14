import { oc } from '@orpc/contract';
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

export const postServiceContract = oc.router({
  post: postContract,
});

export type PostServiceContract = typeof postServiceContract;

export const commentServiceContract = oc.router({
  comment: commentContract,
});

export type CommentServiceContract = typeof commentServiceContract;

export const categoryServiceContract = oc.router({
  category: categoryContract,
});

export type CategoryServiceContract = typeof categoryServiceContract;

export const tagServiceContract = oc.router({
  tag: tagContract,
});

export type TagServiceContract = typeof tagServiceContract;

export const metaServiceContract = oc.router({
  category: categoryContract,
  tag: tagContract,
});

export type MetaServiceContract = typeof metaServiceContract;

