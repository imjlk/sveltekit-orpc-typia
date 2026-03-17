import { tags } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { tagContract } from '@repo/shared';
import { internalError } from '../../lib/errors';
import { trimRequired } from '../../lib/input';
import type { AppContext, DbClient } from '../../types';

type TagInsert = typeof tags.$inferInsert;

const tag = implement(tagContract).$context<AppContext>();

export const createTagRouter = (db: DbClient) =>
  tag.router({
    create: tag.create.handler(async ({ input }) => {
      const trimmedInput: Pick<TagInsert, 'name'> = {
        name: trimRequired('Name', input.name),
      };

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
          throw internalError('Tag creation failed');
        }

        return existing;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw internalError('Failed to create tag', error);
      }
    }),
    list: tag.list.handler(async () => {
      return db.select().from(tags).all();
    }),
  });
