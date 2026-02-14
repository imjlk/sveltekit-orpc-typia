import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CreateTagInput, Tag } from './types';
import { attachOpenApiUnit } from '../../transport/openapi';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type TagRow = import('@repo/db/schema-types').TagRow;

export const createTagSchema = attachOpenApiUnit(typia.createValidate<CreateTagInput>(), typia.json.schema<CreateTagInput>());

const tagDtoSchema = attachOpenApiUnit(typia.createValidate<Tag>(), typia.json.schema<Tag>());
export const tagSchema: StandardSchemaV1<TagRow, Tag> = mapStandardSchema(tagDtoSchema, serializeForTransport);

const tagListDtoSchema = attachOpenApiUnit(typia.createValidate<Tag[]>(), typia.json.schema<Tag[]>());
export const tagListSchema: StandardSchemaV1<TagRow[], Tag[]> = mapStandardSchema(
  tagListDtoSchema,
  serializeForTransport,
);
