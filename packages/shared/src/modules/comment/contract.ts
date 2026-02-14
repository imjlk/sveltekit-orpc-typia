import { oc } from '@orpc/contract';
import { commentListSchema, commentSchema, createCommentSchema, listCommentsByPostSchema } from './schema';
import { badRequestDataSchema } from '../../errors/schema';

export const commentContract = oc.tag('comment').router({
  create: oc
    .input(createCommentSchema)
    .output(commentSchema)
    .route({ summary: 'Create comment' })
    .errors({
      BAD_REQUEST: {
        status: 400,
        message: 'Invalid comment data',
        data: badRequestDataSchema,
      },
    }),
  listByPost: oc
    .input(listCommentsByPostSchema)
    .output(commentListSchema)
    .route({ method: 'GET', summary: 'List comments by post' }),
});

export type CommentContract = typeof commentContract;
