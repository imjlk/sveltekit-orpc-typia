import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CreateTagInput, Tag } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { typiaMappedSchema, typiaSchema } from '../../transport/typia';

type TagRow = import('@repo/db/schema-types').TagRow;

export const createTagSchema = typiaSchema(
  typia.createValidate<CreateTagInput>(),
  typia.json.schema<CreateTagInput>(),
);

const tagDtoSchema = typiaSchema(typia.createValidate<Tag>(), typia.json.schema<Tag>());
export const tagSchema: StandardSchemaV1<TagRow, Tag> = typiaMappedSchema(tagDtoSchema, serializeForTransport);

const tagListDtoSchema = typiaSchema(typia.createValidate<Tag[]>(), typia.json.schema<Tag[]>());
export const tagListSchema: StandardSchemaV1<TagRow[], Tag[]> = typiaMappedSchema(tagListDtoSchema, serializeForTransport);
