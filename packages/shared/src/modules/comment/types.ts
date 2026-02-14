import type { tags } from 'typia';
import type { SerializeForTransport } from '../../transport/serialize';

type CommentRow = import('@repo/db/schema-types').CommentRow;
type PostRow = import('@repo/db/schema-types').PostRow;

export type Comment = SerializeForTransport<CommentRow>;

export type CreateCommentInput = {
  postId: PostRow['id'];
  content: CommentRow['content'] & tags.MinLength<1>;
};

export type ListCommentsByPostInput = {
  postId: PostRow['id'];
};
