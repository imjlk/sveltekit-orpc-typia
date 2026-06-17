import { and, desc, eq, inArray } from 'drizzle-orm';
import { ORPCError, implement } from '@orpc/server';
import type * as sqliteSchema from '@repo/db/schema';
import { postContract } from '@repo/shared';
import { resolveClientIp } from '../../lib/capabilities';
import { badRequest, internalError, notFound, rateLimited, unauthorized } from '../../lib/errors';
import { resolveSelect, toDbRuntime } from '../../lib/db-runtime';
import { normalizeCreatePostInput } from './normalize';
import type { AppContext, DbRuntimeInput } from '../../types';

type PostInsert = typeof sqliteSchema.posts.$inferInsert;
type PostActivityRow = typeof sqliteSchema.postActivity.$inferSelect;

const post = implement(postContract).$context<AppContext>();

const requireUserId = (context: AppContext): string => {
  const userId = context.auth?.userId?.trim();
  if (!userId) {
    throw unauthorized('Sign in to access posts.');
  }

  return userId;
};

const shouldProjectActivityInline = (request: Request): boolean => {
  const hostname = new URL(request.url).hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost';
};

export const createPostRouter = (input: DbRuntimeInput) => {
  const { db, schema } = toDbRuntime(input);
  const { postActivity, postTags, posts } = schema as typeof sqliteSchema;

  return post.router({
    create: post.create.handler(async ({ input, context }) => {
      const normalized = normalizeCreatePostInput(input);
      const userId = requireUserId(context);
      const limitResult = context.edgeGuard
        ? await context.edgeGuard.checkPostCreateLimit({
            key: `user:${userId}`,
            route: 'post.create',
            userId,
            ip: resolveClientIp(context.request),
          })
        : null;

      if (limitResult && !limitResult.allowed) {
        throw rateLimited('Too many post creation attempts. Try again shortly.', {
          limit: limitResult.limit,
          remaining: limitResult.remaining,
          retryAfterSeconds: limitResult.retryAfterSeconds,
        });
      }

      const insertInput: Pick<PostInsert, 'authorId' | 'title' | 'content' | 'categoryId'> = {
        authorId: userId,
        title: normalized.title,
        content: normalized.content,
        categoryId: normalized.categoryId,
      };
      const uniqueTagIds = normalized.tagIds;

      if (insertInput.categoryId != null) {
        const categoryExists = await db.query.categories.findFirst({
          columns: { id: true },
          where: (categoriesTable: any) =>
            eq(categoriesTable.id, insertInput.categoryId as number),
        });

        if (!categoryExists) {
          throw badRequest('Invalid categoryId', { reason: 'Invalid categoryId' });
        }
      }

      if (uniqueTagIds.length > 0) {
        const existingTags = await db.query.tags.findMany({
          columns: { id: true },
          where: (tagsTable: any) => inArray(tagsTable.id, uniqueTagIds),
        });

        if (existingTags.length !== uniqueTagIds.length) {
          throw badRequest('Invalid tagIds', { reason: 'Invalid tagIds' });
        }
      }

      let createdPostId: number | null = null;

      try {
        const createdRows = await db.insert(posts).values(insertInput).returning();
        const postRow = createdRows[0];

        if (!postRow) {
          throw internalError('Post creation failed');
        }

        createdPostId = postRow.id;

        if (uniqueTagIds.length > 0) {
          await db
            .insert(postTags)
            .values(uniqueTagIds.map((tagId) => ({ postId: postRow.id, tagId })))
            .onConflictDoNothing()
            .run();
        }

        if (context.postEvents) {
          const createdAt =
            postRow.createdAt instanceof Date ? postRow.createdAt.toISOString() : new Date(postRow.createdAt).toISOString();
          const activityEvent = {
            type: 'post.created' as const,
            eventId: crypto.randomUUID(),
            postId: postRow.id,
            userId,
            createdAt,
          };

          try {
            await context.postEvents.send(activityEvent, { contentType: 'json' });
          } catch (queueError) {
            console.error('Failed to enqueue post.created event:', queueError);
          }

          if (shouldProjectActivityInline(context.request)) {
            try {
              await db
                .insert(postActivity)
                .values({
                  eventId: activityEvent.eventId,
                  postId: activityEvent.postId,
                  userId: activityEvent.userId,
                  type: activityEvent.type,
                  createdAt: postRow.createdAt,
                })
                .onConflictDoNothing()
                .run();
            } catch (projectionError) {
              console.error('Failed to inline-project post.created activity for local services mode:', projectionError);
            }
          }
        }

        return postRow;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        if (createdPostId != null) {
          try {
            await db.delete(posts).where(eq(posts.id, createdPostId));
          } catch (rollbackError) {
            console.error('Failed to rollback post after create failure:', rollbackError);
          }
        }

        throw internalError('Failed to create post', error);
      }
    }),
    list: post.list.handler(async ({ context }) => {
      const userId = requireUserId(context);

      return db.query.posts.findMany({
        where: (postsTable: any) => eq(postsTable.authorId, userId),
      });
    }),
    listActivity: post.listActivity.handler(async ({ context }) => {
      const userId = requireUserId(context);

      return resolveSelect<PostActivityRow[]>(
        db
          .select()
          .from(postActivity)
          .where(eq(postActivity.userId, userId))
          .orderBy(desc(postActivity.createdAt))
          .limit(10),
      );
    }),
    getWithComments: post.getWithComments.handler(async ({ input, context }) => {
      const userId = requireUserId(context);
      const row = await db.query.posts.findFirst({
        where: (postsTable: any) =>
          and(eq(postsTable.id, input.id), eq(postsTable.authorId, userId)),
        with: {
          comments: true,
        },
      });

      if (!row) {
        throw notFound('post', input.id, 'Post not found');
      }

      return row;
    }),
    getWithMeta: post.getWithMeta.handler(async ({ input, context }) => {
      const userId = requireUserId(context);
      const row = await db.query.posts.findFirst({
        where: (postsTable: any) =>
          and(eq(postsTable.id, input.id), eq(postsTable.authorId, userId)),
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
};
