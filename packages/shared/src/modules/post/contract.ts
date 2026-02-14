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
import { commonErrors, notFoundErrors } from '../../errors/common';

export const postContract = oc.tag('post').errors(commonErrors).router({
  create: oc
    .input(createPostSchema)
    .output(postSchema)
    .route({
      summary: 'Create post',
      description:
        'Creates a post. Input is validated and trimmed. Returns the created post (all dates are serialized to ISO strings).',
    }),
  list: oc
    .input(orpcType<void>())
    .output(postListSchema)
    .route({
      method: 'GET',
      summary: 'List posts',
      description: 'Returns all posts.',
    }),
  getWithComments: oc
    .input(getPostWithCommentsInputSchema)
    .output(postWithCommentsSchema)
    .route({
      method: 'GET',
      summary: 'Get post with comments',
      description: 'Returns a post by id, including its comments.',
    })
    .errors(notFoundErrors),
  getWithMeta: oc
    .input(getPostWithMetaInputSchema)
    .output(postWithMetaSchema)
    .route({
      method: 'GET',
      summary: 'Get post with category and tags',
      description: 'Returns a post by id, including optional category and its tags (flattened array).',
    })
    .errors(notFoundErrors),
});

export type PostContract = typeof postContract;
