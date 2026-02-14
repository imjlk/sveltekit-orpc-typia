import { postTags, posts } from '@repo/db';
import type { createDb } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { postContract } from '@repo/shared';

type DbClient = ReturnType<typeof createDb>;
type PostInsert = typeof posts.$inferInsert;

const post = implement(postContract);

export const createPostRouter = (db: DbClient) =>
  post.router({
    create: post.create.handler(async ({ input }) => {
      const trimmedInput: Pick<PostInsert, 'title' | 'content' | 'categoryId'> = {
        title: input.title.trim(),
        content: input.content.trim(),
        categoryId: input.categoryId ?? null,
      };

      if (!trimmedInput.title || !trimmedInput.content) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Title and content are required',
        });
      }

      try {
        const createdPost = db.transaction((tx) => {
          if (trimmedInput.categoryId != null) {
            const categoryExists = tx.query.categories
              .findFirst({
              columns: { id: true },
              where: (categoriesTable, { eq }) => eq(categoriesTable.id, trimmedInput.categoryId as number),
              })
              .sync();

            if (!categoryExists) {
              throw new ORPCError('BAD_REQUEST', {
                message: 'Invalid categoryId',
              });
            }
          }

          const createdRows = tx.insert(posts).values(trimmedInput).returning().all();
          const postRow = createdRows[0];

          if (!postRow) {
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: 'Post creation failed',
            });
          }

          const uniqueTagIds = Array.from(new Set(input.tagIds ?? []));
          if (uniqueTagIds.length > 0) {
            tx.insert(postTags)
              .values(uniqueTagIds.map((tagId) => ({ postId: postRow.id, tagId })))
              .onConflictDoNothing()
              .run();
          }

          return postRow;
        });

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
        throw new ORPCError('NOT_FOUND', {
          message: 'Post not found',
        });
      }

      return row;
    }),
  });
