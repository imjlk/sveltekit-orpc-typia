import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Comment, CreateCommentInput, ListCommentsByPostInput } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type CommentRow = import('@repo/db/schema-types').CommentRow;

export const createCommentSchema = typia.createValidate<CreateCommentInput>();
export const listCommentsByPostSchema = typia.createValidate<ListCommentsByPostInput>();

const commentDtoSchema = typia.createValidate<Comment>();
export const commentSchema: StandardSchemaV1<CommentRow, Comment> = mapStandardSchema(
  commentDtoSchema,
  serializeForTransport,
);

const commentListDtoSchema = typia.createValidate<Comment[]>();
export const commentListSchema: StandardSchemaV1<CommentRow[], Comment[]> = mapStandardSchema(
  commentListDtoSchema,
  serializeForTransport,
);
