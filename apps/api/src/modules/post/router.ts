import { posts } from '@repo/db';
import type { createDb } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { postContract } from '@repo/shared';

type DbClient = ReturnType<typeof createDb>;
type PostInsert = typeof posts.$inferInsert;

const post = implement(postContract);

export const createPostRouter = (db: DbClient) =>
  post.router({
    create: post.create.handler(async ({ input }) => {
      const trimmedInput: Pick<PostInsert, 'title' | 'content'> = {
        title: input.title.trim(),
        content: input.content.trim(),
      };

      if (!trimmedInput.title || !trimmedInput.content) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Title and content are required',
        });
      }

      try {
        const createdRows = await db.insert(posts).values(trimmedInput).returning();
        const createdPost = createdRows[0];

        if (!createdPost) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: 'Post creation failed',
          });
        }

        return createdPost;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create post',
        });
      }
    }),
    list: post.list.handler(async () => {
      return db.select().from(posts).all();
    }),
    getWithComments: post.getWithComments.handler(async ({ input }) => {
      const row = await db.query.posts.findFirst({
        where: (postsTable, { eq }) => eq(postsTable.id, input.id),
        with: {
          comments: true,
        },
      });

      if (!row) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Post not found',
        });
      }

      return row;
    }),
  });
