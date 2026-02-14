import { oc, type as orpcType } from '@orpc/contract';
import { createTagSchema, tagListSchema, tagSchema } from './schema';
import { commonErrors } from '../../errors/common';

export const tagContract = oc.tag('tag').errors(commonErrors).router({
  create: oc
    .input(createTagSchema)
    .output(tagSchema)
    .route({
      summary: 'Create tag',
      description:
        'Creates a tag. Tag names are unique; repeated calls for the same name are idempotent and return the existing tag.',
    }),
  list: oc
    .input(orpcType<void>())
    .output(tagListSchema)
    .route({
      method: 'GET',
      summary: 'List tags',
      description: 'Returns all tags.',
    }),
});

export type TagContract = typeof tagContract;
