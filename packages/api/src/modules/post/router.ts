import { postTags, posts } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { postContract } from '@repo/shared';
import { badRequest, internalError, notFound } from '../../lib/errors';
import { dedupeNumbers, trimRequired } from '../../lib/input';
import type { DbClient } from '../../types';

type PostInsert = typeof posts.$inferInsert;

const post = implement(postContract);

export const createPostRouter = (db: DbClient) =>
  post.router({
    create: post.create.handler(async ({ input }) => {
      const trimmedInput: Pick<PostInsert, 'title' | 'content' | 'categoryId'> = {
        title: trimRequired('Title', input.title),
        content: trimRequired('Content', input.content),
        categoryId: input.categoryId ?? null,
      };

      if (trimmedInput.categoryId != null) {
        const categoryExists = await db.query.categories.findFirst({
          columns: { id: true },
          where: (categoriesTable, { eq }) =>
            eq(categoriesTable.id, trimmedInput.categoryId as number),
        });

        if (!categoryExists) {
          throw badRequest('Invalid categoryId', { reason: 'Invalid categoryId' });
        }
      }

      try {
        const createdRows = await db.insert(posts).values(trimmedInput).returning();
        const postRow = createdRows[0];

        if (!postRow) {
          throw internalError('Post creation failed');
        }

        const uniqueTagIds = dedupeNumbers(input.tagIds ?? []);
        if (uniqueTagIds.length > 0) {
          await db
            .insert(postTags)
            .values(uniqueTagIds.map((tagId) => ({ postId: postRow.id, tagId })))
            .onConflictDoNothing()
            .run();
        }

        return postRow;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw internalError('Failed to create post', error);
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
        throw notFound('post', input.id, 'Post not found');
      }

      return row;
    }),
    getWithMeta: post.getWithMeta.handler(async ({ input }) => {
      const row = await db.query.posts.findFirst({
        where: (postsTable, { eq }) => eq(postsTable.id, input.id),
        with: {
          category: true,
          postTags: {
            with: {
              tag: true,
            },
          },
        },
      });

      if (!row) {
        throw notFound('post', input.id, 'Post not found');
      }

      return row;
    }),
  });
