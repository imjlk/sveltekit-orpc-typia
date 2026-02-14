import { postTags, posts } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { postContract } from '@repo/shared';
import { badRequest, internalError, notFound } from '../../lib/errors';
import { normalizeCreatePostInput } from './normalize';
import type { DbClient } from '../../types';

type PostInsert = typeof posts.$inferInsert;

const post = implement(postContract);

export const createPostRouter = (db: DbClient) =>
  post.router({
    create: post.create.handler(async ({ input }) => {
      const normalized = normalizeCreatePostInput(input);
      const insertInput: Pick<PostInsert, 'title' | 'content' | 'categoryId'> = {
        title: normalized.title,
        content: normalized.content,
        categoryId: normalized.categoryId,
      };

      if (insertInput.categoryId != null) {
        const categoryExists = await db.query.categories.findFirst({
          columns: { id: true },
          where: (categoriesTable, { eq }) =>
            eq(categoriesTable.id, insertInput.categoryId as number),
        });

        if (!categoryExists) {
          throw badRequest('Invalid categoryId', { reason: 'Invalid categoryId' });
        }
      }

      try {
        const createdRows = await db.insert(posts).values(insertInput).returning();
        const postRow = createdRows[0];

        if (!postRow) {
          throw internalError('Post creation failed');
        }

        const uniqueTagIds = normalized.tagIds;
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
