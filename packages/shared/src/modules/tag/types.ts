import type { tags } from 'typia';
import type { SerializeForTransport } from '../../transport/serialize';

type TagRow = import('@repo/db/schema-types').TagRow;

export type Tag = SerializeForTransport<TagRow>;

export type CreateTagInput = {
  name: TagRow['name'] & tags.MinLength<1>;
};

