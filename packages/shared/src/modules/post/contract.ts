import { oc, type as orpcType } from '@orpc/contract';
import {
  createPostSchema,
  getPostWithCommentsInputSchema,
  getPostWithMetaInputSchema,
  postListSchema,
  postSchema,
  postWithCommentsSchema,
  postWithMetaSchema,
} from './schema';

export const postContract = oc.router({
  create: oc
    .input(createPostSchema)
    .output(postSchema)
    .errors({
      BAD_REQUEST: {
        message: 'Invalid post data',
      },
    }),
  list: oc
    .input(orpcType<void>())
    .output(postListSchema),
  getWithComments: oc
    .input(getPostWithCommentsInputSchema)
    .output(postWithCommentsSchema)
    .errors({
      NOT_FOUND: {
        message: 'Post not found',
      },
    }),
  getWithMeta: oc
    .input(getPostWithMetaInputSchema)
    .output(postWithMetaSchema)
    .errors({
      NOT_FOUND: {
        message: 'Post not found',
      },
    }),
});

export type PostContract = typeof postContract;
