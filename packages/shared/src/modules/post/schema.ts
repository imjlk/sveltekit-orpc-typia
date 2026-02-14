import typia from 'typia';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SerializeForTransport } from '../../transport/serialize';
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

export const getPostWithMetaInputSchema = typia.createValidate<GetPostWithMetaInput>();

const postWithMetaDtoSchema = typia.createValidate<PostWithMeta>();
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
