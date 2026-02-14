import { oc, type as orpcType } from '@orpc/contract';
import { categoryListSchema, categorySchema, categoryTreeSchema, createCategorySchema } from './schema';
import { badRequestDataSchema } from '../../errors/schema';

export const categoryContract = oc.tag('category').router({
  create: oc
    .input(createCategorySchema)
    .output(categorySchema)
    .route({ summary: 'Create category' })
    .errors({
      BAD_REQUEST: {
        status: 400,
        message: 'Invalid category data',
        data: badRequestDataSchema,
      },
    }),
  list: oc
    .input(orpcType<void>())
    .output(categoryListSchema)
    .route({ method: 'GET', summary: 'List categories' }),
  tree: oc
    .input(orpcType<void>())
    .output(categoryTreeSchema)
    .route({ method: 'GET', summary: 'Get category tree' }),
});

export type CategoryContract = typeof categoryContract;
