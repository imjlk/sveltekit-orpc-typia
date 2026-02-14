import { oc, type as orpcType } from '@orpc/contract';
import { createTagSchema, tagListSchema, tagSchema } from './schema';

export const tagContract = oc.router({
  create: oc
    .input(createTagSchema)
    .output(tagSchema)
    .errors({
      BAD_REQUEST: {
        message: 'Invalid tag data',
      },
    }),
  list: oc
    .input(orpcType<void>())
    .output(tagListSchema),
});

export type TagContract = typeof tagContract;

