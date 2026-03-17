import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SerializeForTransport } from '../../transport/serialize';
import type {
  CreatePostInput,
  GetPostWithCommentsInput,
  GetPostWithMetaInput,
  PostActivity,
  Post,
  PostWithComments,
  PostWithMeta,
} from './types';
import { serializeForTransport } from '../../transport/serialize';
import { typiaMappedSchema, typiaSchema } from '../../transport/typia';

type PostRow = import('@repo/db/schema-types').PostRow;
type CategoryRow = import('@repo/db/schema-types').CategoryRow;
type CommentRow = import('@repo/db/schema-types').CommentRow;
type TagRow = import('@repo/db/schema-types').TagRow;
type PostTagRow = import('@repo/db/schema-types').PostTagRow;
type PostActivityRow = import('@repo/db/schema-types').PostActivityRow;
type PostWithCommentsRow = PostRow & { comments: CommentRow[] };
type PostWithMetaRow = PostRow & {
  category: CategoryRow | null;
  postTags: Array<PostTagRow & { tag: TagRow }>;
};

export const createPostSchema = typiaSchema(
  typia.createValidate<CreatePostInput>(),
  typia.json.schema<CreatePostInput>(),
);

const postDtoSchema = typiaSchema(typia.createValidate<Post>(), typia.json.schema<Post>());
export const postSchema: StandardSchemaV1<PostRow, Post> = typiaMappedSchema(postDtoSchema, serializeForTransport);

const postListDtoSchema = typiaSchema(typia.createValidate<Post[]>(), typia.json.schema<Post[]>());
export const postListSchema: StandardSchemaV1<PostRow[], Post[]> = typiaMappedSchema(
  postListDtoSchema,
  serializeForTransport,
);

const postActivityDtoSchema = typiaSchema(typia.createValidate<PostActivity>(), typia.json.schema<PostActivity>());
export const postActivitySchema: StandardSchemaV1<PostActivityRow, PostActivity> = typiaMappedSchema(
  postActivityDtoSchema,
  serializeForTransport,
);

const postActivityListDtoSchema = typiaSchema(
  typia.createValidate<PostActivity[]>(),
  typia.json.schema<PostActivity[]>(),
);
export const postActivityListSchema: StandardSchemaV1<PostActivityRow[], PostActivity[]> = typiaMappedSchema(
  postActivityListDtoSchema,
  serializeForTransport,
);

export const getPostWithCommentsInputSchema = typiaSchema(
  typia.createValidate<GetPostWithCommentsInput>(),
  typia.json.schema<GetPostWithCommentsInput>(),
);

const postWithCommentsDtoSchema = typiaSchema(
  typia.createValidate<PostWithComments>(),
  typia.json.schema<PostWithComments>(),
);
export const postWithCommentsSchema: StandardSchemaV1<PostWithCommentsRow, PostWithComments> = typiaMappedSchema(
  postWithCommentsDtoSchema,
  serializeForTransport,
);

export const getPostWithMetaInputSchema = typiaSchema(
  typia.createValidate<GetPostWithMetaInput>(),
  typia.json.schema<GetPostWithMetaInput>(),
);

const postWithMetaDtoSchema = typiaSchema(typia.createValidate<PostWithMeta>(), typia.json.schema<PostWithMeta>());
export const postWithMetaSchema: StandardSchemaV1<PostWithMetaRow, PostWithMeta> = typiaMappedSchema(
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
