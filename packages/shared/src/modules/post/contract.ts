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
import { badRequestDataSchema, notFoundDataSchema } from '../../errors/schema';

export const postContract = oc.tag('post').router({
  create: oc
    .input(createPostSchema)
    .output(postSchema)
    .route({ summary: 'Create post' })
    .errors({
      BAD_REQUEST: {
        status: 400,
        message: 'Invalid post data',
        data: badRequestDataSchema,
      },
    }),
  list: oc
    .input(orpcType<void>())
    .output(postListSchema)
    .route({ method: 'GET', summary: 'List posts' }),
  getWithComments: oc
    .input(getPostWithCommentsInputSchema)
    .output(postWithCommentsSchema)
    .route({ method: 'GET', summary: 'Get post with comments' })
    .errors({
      NOT_FOUND: {
        status: 404,
        message: 'Post not found',
        data: notFoundDataSchema,
      },
    }),
  getWithMeta: oc
    .input(getPostWithMetaInputSchema)
    .output(postWithMetaSchema)
    .route({ method: 'GET', summary: 'Get post with category and tags' })
    .errors({
      NOT_FOUND: {
        status: 404,
        message: 'Post not found',
        data: notFoundDataSchema,
      },
    }),
});

export type PostContract = typeof postContract;
