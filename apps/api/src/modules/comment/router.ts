import { comments, posts } from '@repo/db';
import type { createDb } from '@repo/db/bun';
import { ORPCError, implement } from '@orpc/server';
import { commentContract } from '@repo/shared';

type DbClient = ReturnType<typeof createDb>;
type CommentInsert = typeof comments.$inferInsert;

const comment = implement(commentContract);

export const createCommentRouter = (db: DbClient) =>
  comment.router({
    create: comment.create.handler(async ({ input }) => {
      const trimmedInput: Pick<CommentInsert, 'postId' | 'content'> = {
        postId: input.postId,
        content: input.content.trim(),
      };

      if (!trimmedInput.content) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Content is required',
        });
      }

      // Optional: validate post exists early to return a nicer error.
      const postExists = await db.query.posts.findFirst({
        columns: { id: true },
        where: (postsTable, { eq }) => eq(postsTable.id, trimmedInput.postId),
      });

      if (!postExists) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid postId',
        });
      }

      try {
        const createdRows = await db.insert(comments).values(trimmedInput).returning();
        const createdComment = createdRows[0];

        if (!createdComment) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: 'Comment creation failed',
          });
        }

        return createdComment;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create comment',
        });
      }
    }),
    listByPost: comment.listByPost.handler(async ({ input }) => {
      return db.query.comments.findMany({
        where: (commentsTable, { eq }) => eq(commentsTable.postId, input.postId),
      });
    }),
  });
