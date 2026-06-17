import { eq } from 'drizzle-orm';
import { ORPCError, implement } from '@orpc/server';
import type * as sqliteSchema from '@repo/db/schema';
import { commentContract } from '@repo/shared';
import { badRequest, internalError } from '../../lib/errors';
import { normalizeCreateCommentInput } from './normalize';
import { toDbRuntime } from '../../lib/db-runtime';
import type { AppContext, DbRuntimeInput } from '../../types';

type CommentInsert = typeof sqliteSchema.comments.$inferInsert;

const comment = implement(commentContract).$context<AppContext>();

export const createCommentRouter = (input: DbRuntimeInput) => {
  const { db, schema } = toDbRuntime(input);
  const { comments } = schema as typeof sqliteSchema;

  return comment.router({
    create: comment.create.handler(async ({ input }) => {
      const normalized = normalizeCreateCommentInput(input);
      const insertInput: Pick<CommentInsert, 'postId' | 'content'> = {
        postId: normalized.postId,
        content: normalized.content,
      };

      // Optional: validate post exists early to return a nicer error.
      const postExists = await db.query.posts.findFirst({
        columns: { id: true },
        where: (postsTable: any) => eq(postsTable.id, insertInput.postId),
      });

      if (!postExists) {
        throw badRequest('Invalid postId', { reason: 'Invalid postId' });
      }

      try {
        const createdRows = await db.insert(comments).values(insertInput).returning();
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
        where: (commentsTable: any) => eq(commentsTable.postId, input.postId),
      });
    }),
  });
};
