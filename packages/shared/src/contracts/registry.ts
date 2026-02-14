import { categoryContract } from '../modules/category/contract';
import { commentContract } from '../modules/comment/contract';
import { postContract } from '../modules/post/contract';
import { tagContract } from '../modules/tag/contract';

/**
 * Single source of truth (SSOT) for domain routers.
 *
 * Use this when composing:
 * - appContract (all routers)
 * - service-oriented contracts (router subsets)
 * - worker split deployments (service bindings)
 * - OpenAPI tag definitions
 */

export const ROUTER_CONTRACTS = {
  post: postContract,
  comment: commentContract,
  category: categoryContract,
  tag: tagContract,
} as const;

export type RouterName = keyof typeof ROUTER_CONTRACTS;

export const SERVICE_GROUPS = {
  content: ['post', 'comment'],
  meta: ['category', 'tag'],
} as const satisfies Record<string, readonly RouterName[]>;

export const OPENAPI_TAG_DEFINITIONS = [
  { name: 'post', description: 'Posts domain procedures.' },
  { name: 'comment', description: 'Comments domain procedures.' },
  { name: 'category', description: 'Hierarchical categories (tree) procedures.' },
  { name: 'tag', description: 'Flat tags procedures.' },
] as const;

export const pick = <T, const K extends readonly (keyof T)[]>(obj: T, keys: K): Pick<T, K[number]> => {
  const out = {} as Pick<T, K[number]>;

  for (const key of keys) {
    out[key] = obj[key];
  }

  return out;
};

