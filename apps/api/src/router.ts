import { createDb, posts } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { postContract } from '@repo/shared';
import type { Post } from '@repo/shared';

const db = createDb();

const post = implement(postContract);

const toPostDto = (row: typeof posts.$inferSelect): Post => ({
  id: row.id,
  title: row.title,
  content: row.content,
  createdAt: row.createdAt.toISOString(),
});

export const postRouter = post.router({
  post: {
    create: post.post.create.handler(async ({ input }) => {
      const trimmedInput = {
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

        return toPostDto(createdPost);
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create post',
        });
      }
    }),
    list: post.post.list.handler(async () => {
      const allPosts = await db.select().from(posts).all();
      return allPosts.map(toPostDto);
    }),
  },
});

export type PostRouter = typeof postRouter;
