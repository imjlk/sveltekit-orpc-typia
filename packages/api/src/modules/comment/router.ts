import { comments } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { commentContract } from '@repo/shared';
import { badRequest, internalError } from '../../lib/errors';
import { trimRequired } from '../../lib/input';
import type { DbClient } from '../../types';

type CommentInsert = typeof comments.$inferInsert;

const comment = implement(commentContract);

export const createCommentRouter = (db: DbClient) =>
  comment.router({
    create: comment.create.handler(async ({ input }) => {
      const trimmedInput: Pick<CommentInsert, 'postId' | 'content'> = {
        postId: input.postId,
        content: trimRequired('Content', input.content),
      };

      // Optional: validate post exists early to return a nicer error.
      const postExists = await db.query.posts.findFirst({
        columns: { id: true },
        where: (postsTable, { eq }) => eq(postsTable.id, trimmedInput.postId),
      });

      if (!postExists) {
        throw badRequest('Invalid postId', { reason: 'Invalid postId' });
      }

      try {
        const createdRows = await db.insert(comments).values(trimmedInput).returning();
        const createdComment = createdRows[0];

        if (!createdComment) {
          throw internalError('Comment creation failed');
        }

        return createdComment;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw internalError('Failed to create comment', error);
      }
    }),
    listByPost: comment.listByPost.handler(async ({ input }) => {
      return db.query.comments.findMany({
        where: (commentsTable, { eq }) => eq(commentsTable.postId, input.postId),
      });
    }),
  });
