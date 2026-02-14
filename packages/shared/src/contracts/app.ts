import { oc } from '@orpc/contract';
import { commentContract } from '../modules/comment/contract';
import { postContract } from '../modules/post/contract';

export const appContract = oc.router({
  post: postContract,
  comment: commentContract,
});

export type AppContract = typeof appContract;
