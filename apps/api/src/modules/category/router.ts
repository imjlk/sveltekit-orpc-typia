import { categories } from '@repo/db';
import type { createDb } from '@repo/db/bun';
import { ORPCError, implement } from '@orpc/server';
import { categoryContract } from '@repo/shared';

type DbClient = ReturnType<typeof createDb>;
type CategoryRow = typeof categories.$inferSelect;
type CategoryInsert = typeof categories.$inferInsert;
type CategoryTreeNodeRow = CategoryRow & { children: CategoryTreeNodeRow[] };

const category = implement(categoryContract);

export const createCategoryRouter = (db: DbClient) =>
  category.router({
    create: category.create.handler(async ({ input }) => {
      const trimmedInput: Pick<CategoryInsert, 'name' | 'parentId'> = {
        name: input.name.trim(),
        parentId: input.parentId ?? null,
      };

      if (!trimmedInput.name) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Name is required',
        });
      }

      if (trimmedInput.parentId != null) {
        const parentExists = await db.query.categories.findFirst({
          columns: { id: true },
          where: (categoriesTable, { eq }) => eq(categoriesTable.id, trimmedInput.parentId as number),
        });

        if (!parentExists) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'Invalid parentId',
          });
        }
      }

      try {
        const createdRows = await db.insert(categories).values(trimmedInput).returning();
        const createdCategory = createdRows[0];

        if (!createdCategory) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: 'Category creation failed',
          });
        }

        return createdCategory;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create category',
        });
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
