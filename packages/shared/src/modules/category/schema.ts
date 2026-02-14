import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Category, CategoryTreeNode, CreateCategoryInput } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type CategoryRow = import('@repo/db/schema-types').CategoryRow;
type CategoryTreeNodeRow = CategoryRow & { children: CategoryTreeNodeRow[] };

export const createCategorySchema = typia.createValidate<CreateCategoryInput>();

const categoryDtoSchema = typia.createValidate<Category>();
export const categorySchema: StandardSchemaV1<CategoryRow, Category> = mapStandardSchema(
  categoryDtoSchema,
  serializeForTransport,
);

const categoryListDtoSchema = typia.createValidate<Category[]>();
export const categoryListSchema: StandardSchemaV1<CategoryRow[], Category[]> = mapStandardSchema(
  categoryListDtoSchema,
  serializeForTransport,
);

const categoryTreeDtoSchema = typia.createValidate<CategoryTreeNode[]>();
export const categoryTreeSchema: StandardSchemaV1<CategoryTreeNodeRow[], CategoryTreeNode[]> = mapStandardSchema(
  categoryTreeDtoSchema,
  serializeForTransport,
);

