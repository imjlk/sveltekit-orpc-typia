import { oc } from '@orpc/contract';
import { commentListSchema, commentSchema, createCommentSchema, listCommentsByPostSchema } from './schema';
import { badRequestDataSchema } from '../../errors/schema';

export const commentContract = oc.tag('comment').router({
  create: oc
    .input(createCommentSchema)
    .output(commentSchema)
    .route({
      summary: 'Create comment',
      description:
        'Creates a comment for a post. Input is validated and trimmed. Returns the created comment (all dates are serialized to ISO strings).',
    })
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
    .route({
      method: 'GET',
      summary: 'List comments by post',
      description: 'Returns comments for a single post.',
    }),
});

export type CommentContract = typeof commentContract;
