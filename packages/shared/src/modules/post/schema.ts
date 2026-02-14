import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SerializeForTransport } from '../../transport/serialize';
import { attachOpenApiUnit } from '../../transport/openapi';
import type {
  CreatePostInput,
  GetPostWithCommentsInput,
  GetPostWithMetaInput,
  Post,
  PostWithComments,
  PostWithMeta,
} from './types';
import { serializeForTransport } from '../../transport/serialize';
import { mapStandardSchema } from '../../transport/standard';

type PostRow = import('@repo/db/schema-types').PostRow;
type CategoryRow = import('@repo/db/schema-types').CategoryRow;
type CommentRow = import('@repo/db/schema-types').CommentRow;
type TagRow = import('@repo/db/schema-types').TagRow;
type PostTagRow = import('@repo/db/schema-types').PostTagRow;
type PostWithCommentsRow = PostRow & { comments: CommentRow[] };
type PostWithMetaRow = PostRow & {
  category: CategoryRow | null;
  postTags: Array<PostTagRow & { tag: TagRow }>;
};

export const createPostSchema = attachOpenApiUnit(
  typia.createValidate<CreatePostInput>(),
  typia.json.schema<CreatePostInput>(),
);

const postDtoSchema = attachOpenApiUnit(typia.createValidate<Post>(), typia.json.schema<Post>());
export const postSchema: StandardSchemaV1<PostRow, Post> = mapStandardSchema(
  postDtoSchema,
  serializeForTransport,
);

const postListDtoSchema = attachOpenApiUnit(typia.createValidate<Post[]>(), typia.json.schema<Post[]>());
export const postListSchema: StandardSchemaV1<PostRow[], Post[]> = mapStandardSchema(
  postListDtoSchema,
  serializeForTransport,
);

export const getPostWithCommentsInputSchema = attachOpenApiUnit(
  typia.createValidate<GetPostWithCommentsInput>(),
  typia.json.schema<GetPostWithCommentsInput>(),
);

const postWithCommentsDtoSchema = attachOpenApiUnit(
  typia.createValidate<PostWithComments>(),
  typia.json.schema<PostWithComments>(),
);
export const postWithCommentsSchema: StandardSchemaV1<PostWithCommentsRow, PostWithComments> = mapStandardSchema(
  postWithCommentsDtoSchema,
  serializeForTransport,
);

export const getPostWithMetaInputSchema = attachOpenApiUnit(
  typia.createValidate<GetPostWithMetaInput>(),
  typia.json.schema<GetPostWithMetaInput>(),
);

const postWithMetaDtoSchema = attachOpenApiUnit(typia.createValidate<PostWithMeta>(), typia.json.schema<PostWithMeta>());
export const postWithMetaSchema: StandardSchemaV1<PostWithMetaRow, PostWithMeta> = mapStandardSchema(
  postWithMetaDtoSchema,
  (row) => {
    const serialized = serializeForTransport(row) as SerializeForTransport<PostWithMetaRow>;
    const { postTags, ...rest } = serialized;

    return {
      ...rest,
      tags: postTags.map((pt) => pt.tag),
    };
  },
);
