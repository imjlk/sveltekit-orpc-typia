import { oc, type as orpcType } from '@orpc/contract';
import { createPostSchema, postListSchema, postSchema } from './schema';

export const postContract = oc.router({
  post: {
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
  },
});

export type PostContract = typeof postContract;
