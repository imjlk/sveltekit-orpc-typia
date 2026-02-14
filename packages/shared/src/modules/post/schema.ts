import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CreatePostInput, GetPostWithCommentsInput, Post, PostWithComments } from './types';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type PostRow = import('@repo/db/schema-types').PostRow;
type CommentRow = import('@repo/db/schema-types').CommentRow;
type PostWithCommentsRow = PostRow & { comments: CommentRow[] };

export const createPostSchema = typia.createValidate<CreatePostInput>();

const postDtoSchema = typia.createValidate<Post>();
export const postSchema: StandardSchemaV1<PostRow, Post> = mapStandardSchema(
  postDtoSchema,
  serializeForTransport,
);

const postListDtoSchema = typia.createValidate<Post[]>();
export const postListSchema: StandardSchemaV1<PostRow[], Post[]> = mapStandardSchema(
  postListDtoSchema,
  serializeForTransport,
);

export const getPostWithCommentsInputSchema = typia.createValidate<GetPostWithCommentsInput>();

const postWithCommentsDtoSchema = typia.createValidate<PostWithComments>();
export const postWithCommentsSchema: StandardSchemaV1<PostWithCommentsRow, PostWithComments> = mapStandardSchema(
  postWithCommentsDtoSchema,
  serializeForTransport,
);
