import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CreateTagInput, Tag } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type TagRow = import('@repo/db/schema-types').TagRow;

export const createTagSchema = typia.createValidate<CreateTagInput>();

const tagDtoSchema = typia.createValidate<Tag>();
export const tagSchema: StandardSchemaV1<TagRow, Tag> = mapStandardSchema(tagDtoSchema, serializeForTransport);

const tagListDtoSchema = typia.createValidate<Tag[]>();
export const tagListSchema: StandardSchemaV1<TagRow[], Tag[]> = mapStandardSchema(
  tagListDtoSchema,
  serializeForTransport,
);

