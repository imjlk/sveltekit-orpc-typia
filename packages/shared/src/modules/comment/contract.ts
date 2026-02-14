import { oc } from '@orpc/contract';
import { commentListSchema, commentSchema, createCommentSchema, listCommentsByPostSchema } from './schema';

export const commentContract = oc.router({
  create: oc
    .input(createCommentSchema)
    .output(commentSchema)
    .errors({
      BAD_REQUEST: {
        message: 'Invalid comment data',
      },
    }),
  listByPost: oc
    .input(listCommentsByPostSchema)
    .output(commentListSchema),
});

export type CommentContract = typeof commentContract;

