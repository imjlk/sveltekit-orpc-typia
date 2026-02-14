import { tags } from '@repo/db';
import type { createDb } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { tagContract } from '@repo/shared';

type DbClient = ReturnType<typeof createDb>;
type TagInsert = typeof tags.$inferInsert;

const tag = implement(tagContract);

export const createTagRouter = (db: DbClient) =>
  tag.router({
    create: tag.create.handler(async ({ input }) => {
      const trimmedInput: Pick<TagInsert, 'name'> = {
        name: input.name.trim(),
      };

      if (!trimmedInput.name) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Name is required',
        });
      }

      try {
        const createdRows = await db
          .insert(tags)
          .values(trimmedInput)
          .onConflictDoNothing({ target: tags.name })
          .returning();

        const createdTag = createdRows[0];
        if (createdTag) {
          return createdTag;
        }

        const existing = await db.query.tags.findFirst({
          where: (tagsTable, { eq }) => eq(tagsTable.name, trimmedInput.name),
        });

        if (!existing) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: 'Tag creation failed',
          });
        }

        return existing;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create tag',
        });
      }
    }),
    list: tag.list.handler(async () => {
      return db.select().from(tags).all();
    }),
  });

