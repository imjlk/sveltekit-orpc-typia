import { oc, type as orpcType } from '@orpc/contract';
import { createTagSchema, tagListSchema, tagSchema } from './schema';
import { badRequestDataSchema } from '../../errors/schema';

export const tagContract = oc.tag('tag').router({
  create: oc
    .input(createTagSchema)
    .output(tagSchema)
    .route({ summary: 'Create tag' })
    .errors({
      BAD_REQUEST: {
        status: 400,
        message: 'Invalid tag data',
        data: badRequestDataSchema,
      },
    }),
  list: oc
    .input(orpcType<void>())
    .output(tagListSchema)
    .route({ method: 'GET', summary: 'List tags' }),
});

export type TagContract = typeof tagContract;
