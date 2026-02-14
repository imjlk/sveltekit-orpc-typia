import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Category, CategoryTreeNode, CreateCategoryInput } from './types';
import { attachOpenApiUnit } from '../../transport/openapi';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type CategoryRow = import('@repo/db/schema-types').CategoryRow;
type CategoryTreeNodeRow = CategoryRow & { children: CategoryTreeNodeRow[] };

export const createCategorySchema = attachOpenApiUnit(
  typia.createValidate<CreateCategoryInput>(),
  typia.json.schema<CreateCategoryInput>(),
);

const categoryDtoSchema = attachOpenApiUnit(typia.createValidate<Category>(), typia.json.schema<Category>());
export const categorySchema: StandardSchemaV1<CategoryRow, Category> = mapStandardSchema(
  categoryDtoSchema,
  serializeForTransport,
);

const categoryListDtoSchema = attachOpenApiUnit(typia.createValidate<Category[]>(), typia.json.schema<Category[]>());
export const categoryListSchema: StandardSchemaV1<CategoryRow[], Category[]> = mapStandardSchema(
  categoryListDtoSchema,
  serializeForTransport,
);

const categoryTreeDtoSchema = attachOpenApiUnit(
  typia.createValidate<CategoryTreeNode[]>(),
  typia.json.schema<CategoryTreeNode[]>(),
);
export const categoryTreeSchema: StandardSchemaV1<CategoryTreeNodeRow[], CategoryTreeNode[]> = mapStandardSchema(
  categoryTreeDtoSchema,
  serializeForTransport,
);
