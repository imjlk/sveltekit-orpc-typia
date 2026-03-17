import type { tags } from 'typia';

type PostRow = import('@repo/db/schema-types').PostRow;
type PostActivityRow = import('@repo/db/schema-types').PostActivityRow;
type TagRow = import('@repo/db/schema-types').TagRow;
import type { SerializeForTransport } from '../../transport/serialize';
import type { Comment } from '../comment/types';
import type { Category } from '../category/types';
import type { Tag } from '../tag/types';

export type Post = SerializeForTransport<PostRow>;
export type PostActivity = SerializeForTransport<PostActivityRow>;

export type CreatePostInput = {
  title: PostRow['title'] & tags.MinLength<1>;
  content: PostRow['content'] & tags.MinLength<1>;
  categoryId?: PostRow['categoryId'];
  tagIds?: TagRow['id'][];
};

export type GetPostWithCommentsInput = {
  id: PostRow['id'];
};

export type GetPostWithMetaInput = {
  id: PostRow['id'];
};

export type PostWithComments = Post & {
  comments: Comment[];
};

export type PostWithMeta = Post & {
  category: Category | null;
  tags: Tag[];
};

export type { SerializeForTransport };
