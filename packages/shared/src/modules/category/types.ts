import type { tags } from 'typia';
import type { SerializeForTransport } from '../../transport/serialize';

type CategoryRow = import('@repo/db/schema-types').CategoryRow;

export type Category = SerializeForTransport<CategoryRow>;

export type CreateCategoryInput = {
  name: CategoryRow['name'] & tags.MinLength<1>;
  parentId?: CategoryRow['id'] | null;
};

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
};

