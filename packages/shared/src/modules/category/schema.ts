import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Category, CategoryTreeNode, CreateCategoryInput } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { typiaMappedSchema, typiaSchema } from '../../transport/typia';

type CategoryRow = import('@repo/db/schema-types').CategoryRow;
type CategoryTreeNodeRow = CategoryRow & { children: CategoryTreeNodeRow[] };

export const createCategorySchema = typiaSchema(
  typia.createValidate<CreateCategoryInput>(),
  typia.json.schema<CreateCategoryInput>(),
);

const categoryDtoSchema = typiaSchema(typia.createValidate<Category>(), typia.json.schema<Category>());
export const categorySchema: StandardSchemaV1<CategoryRow, Category> = typiaMappedSchema(categoryDtoSchema, serializeForTransport);

const categoryListDtoSchema = typiaSchema(typia.createValidate<Category[]>(), typia.json.schema<Category[]>());
export const categoryListSchema: StandardSchemaV1<CategoryRow[], Category[]> = typiaMappedSchema(
  categoryListDtoSchema,
  serializeForTransport,
);

const categoryTreeDtoSchema = typiaSchema(
  typia.createValidate<CategoryTreeNode[]>(),
  typia.json.schema<CategoryTreeNode[]>(),
);
export const categoryTreeSchema: StandardSchemaV1<CategoryTreeNodeRow[], CategoryTreeNode[]> = typiaMappedSchema(
  categoryTreeDtoSchema,
  serializeForTransport,
);
