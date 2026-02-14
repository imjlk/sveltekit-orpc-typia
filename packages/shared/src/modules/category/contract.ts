import { oc, type as orpcType } from '@orpc/contract';
import { categoryListSchema, categorySchema, categoryTreeSchema, createCategorySchema } from './schema';

export const categoryContract = oc.router({
  create: oc
    .input(createCategorySchema)
    .output(categorySchema)
    .errors({
      BAD_REQUEST: {
        message: 'Invalid category data',
      },
    }),
  list: oc
    .input(orpcType<void>())
    .output(categoryListSchema),
  tree: oc
    .input(orpcType<void>())
    .output(categoryTreeSchema),
});

export type CategoryContract = typeof categoryContract;

