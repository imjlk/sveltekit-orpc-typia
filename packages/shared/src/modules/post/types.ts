import type { tags } from 'typia';

type PostRow = import('@repo/db/schema-types').PostRow;
import type { SerializeForTransport } from '../../transport/serialize';
import type { Comment } from '../comment/types';

export type Post = SerializeForTransport<PostRow>;

export type CreatePostInput = {
  title: PostRow['title'] & tags.MinLength<1>;
  content: PostRow['content'] & tags.MinLength<1>;
};

export type GetPostWithCommentsInput = {
  id: PostRow['id'];
};

export type PostWithComments = Post & {
  comments: Comment[];
};

export type { SerializeForTransport };
