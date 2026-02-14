import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Comment, CreateCommentInput, ListCommentsByPostInput } from './types';
import { attachOpenApiUnit } from '../../transport/openapi';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type CommentRow = import('@repo/db/schema-types').CommentRow;

export const createCommentSchema = attachOpenApiUnit(
  typia.createValidate<CreateCommentInput>(),
  typia.json.schema<CreateCommentInput>(),
);
export const listCommentsByPostSchema = attachOpenApiUnit(
  typia.createValidate<ListCommentsByPostInput>(),
  typia.json.schema<ListCommentsByPostInput>(),
);

const commentDtoSchema = attachOpenApiUnit(typia.createValidate<Comment>(), typia.json.schema<Comment>());
export const commentSchema: StandardSchemaV1<CommentRow, Comment> = mapStandardSchema(
  commentDtoSchema,
  serializeForTransport,
);

const commentListDtoSchema = attachOpenApiUnit(typia.createValidate<Comment[]>(), typia.json.schema<Comment[]>());
export const commentListSchema: StandardSchemaV1<CommentRow[], Comment[]> = mapStandardSchema(
  commentListDtoSchema,
  serializeForTransport,
);
