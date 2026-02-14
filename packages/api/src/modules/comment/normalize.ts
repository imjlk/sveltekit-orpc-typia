import type { CreateCommentInput } from '@repo/shared';
import { trimRequired } from '../../lib/input';

export const normalizeCreateCommentInput = (input: CreateCommentInput) => {
  const content = trimRequired('Content', input.content);

  return {
    postId: input.postId,
    content,
  };
};

