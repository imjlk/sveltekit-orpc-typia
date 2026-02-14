import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Comment, CreateCommentInput, ListCommentsByPostInput } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { typiaMappedSchema, typiaSchema } from '../../transport/typia';

type CommentRow = import('@repo/db/schema-types').CommentRow;

export const createCommentSchema = typiaSchema(
  typia.createValidate<CreateCommentInput>(),
  typia.json.schema<CreateCommentInput>(),
);
export const listCommentsByPostSchema = typiaSchema(
  typia.createValidate<ListCommentsByPostInput>(),
  typia.json.schema<ListCommentsByPostInput>(),
);

const commentDtoSchema = typiaSchema(typia.createValidate<Comment>(), typia.json.schema<Comment>());
export const commentSchema: StandardSchemaV1<CommentRow, Comment> = typiaMappedSchema(commentDtoSchema, serializeForTransport);

const commentListDtoSchema = typiaSchema(typia.createValidate<Comment[]>(), typia.json.schema<Comment[]>());
export const commentListSchema: StandardSchemaV1<CommentRow[], Comment[]> = typiaMappedSchema(
  commentListDtoSchema,
  serializeForTransport,
);
