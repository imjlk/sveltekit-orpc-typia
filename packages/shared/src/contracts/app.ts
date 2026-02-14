import { oc } from '@orpc/contract';
import { categoryContract } from '../modules/category/contract';
import { commentContract } from '../modules/comment/contract';
import { postContract } from '../modules/post/contract';
import { tagContract } from '../modules/tag/contract';

export const appContract = oc.router({
  post: postContract,
  comment: commentContract,
  category: categoryContract,
  tag: tagContract,
});

export type AppContract = typeof appContract;
