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
    .route({
      summary: 'Create post',
      description:
        'Creates a post. Input is validated and trimmed. Returns the created post (all dates are serialized to ISO strings).',
    })
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
    .route({
      method: 'GET',
      summary: 'Get post with category and tags',
      description: 'Returns a post by id, including optional category and its tags (flattened array).',
    })
    .errors({
      NOT_FOUND: {
        status: 404,
        message: 'Post not found',
        data: notFoundDataSchema,
      },
    }),
});

export type PostContract = typeof postContract;
