import { oc, type as orpcType } from '@orpc/contract';
import { categoryListSchema, categorySchema, categoryTreeSchema, createCategorySchema } from './schema';
import { badRequestDataSchema } from '../../errors/schema';

export const categoryContract = oc.tag('category').router({
  create: oc
    .input(createCategorySchema)
    .output(categorySchema)
    .route({
      summary: 'Create category',
      description:
        'Creates a category node. Optionally links to a parent category. Returns the created category (all dates are serialized to ISO strings).',
    })
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
    .route({
      method: 'GET',
      summary: 'List categories',
      description: 'Returns all categories as a flat list.',
    }),
  tree: oc
    .input(orpcType<void>())
    .output(categoryTreeSchema)
    .route({
      method: 'GET',
      summary: 'Get category tree',
      description: 'Returns categories as a hierarchical tree (roots with recursive children).',
    }),
});

export type CategoryContract = typeof categoryContract;
