import { categories } from '@repo/db';
import { ORPCError, implement } from '@orpc/server';
import { categoryContract } from '@repo/shared';
import { badRequest, internalError } from '../../lib/errors';
import { trimRequired } from '../../lib/input';
import type { DbClient } from '../../types';

type CategoryRow = typeof categories.$inferSelect;
type CategoryInsert = typeof categories.$inferInsert;
type CategoryTreeNodeRow = CategoryRow & { children: CategoryTreeNodeRow[] };

const category = implement(categoryContract);

export const createCategoryRouter = (db: DbClient) =>
  category.router({
    create: category.create.handler(async ({ input }) => {
      const trimmedInput: Pick<CategoryInsert, 'name' | 'parentId'> = {
        name: trimRequired('Name', input.name),
        parentId: input.parentId ?? null,
      };

      if (trimmedInput.parentId != null) {
        const parentExists = await db.query.categories.findFirst({
          columns: { id: true },
          where: (categoriesTable, { eq }) => eq(categoriesTable.id, trimmedInput.parentId as number),
        });

        if (!parentExists) {
          throw badRequest('Invalid parentId', { reason: 'Invalid parentId' });
        }
      }

      try {
        const createdRows = await db.insert(categories).values(trimmedInput).returning();
        const createdCategory = createdRows[0];

        if (!createdCategory) {
          throw internalError('Category creation failed');
        }

        return createdCategory;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw internalError('Failed to create category', error);
      }
    }),
    list: category.list.handler(async () => {
      return db.select().from(categories).all();
    }),
    tree: category.tree.handler(async () => {
      const rows = await db.select().from(categories).all();
      rows.sort((a, b) => a.id - b.id);

      const nodesById = new Map<number, CategoryTreeNodeRow>();
      for (const row of rows) {
        nodesById.set(row.id, { ...row, children: [] });
      }

      const roots: CategoryTreeNodeRow[] = [];
      for (const node of nodesById.values()) {
        if (node.parentId != null) {
          const parent = nodesById.get(node.parentId);
          if (parent) {
            parent.children.push(node);
            continue;
          }
        }

        roots.push(node);
      }

      return roots;
    }),
  });
