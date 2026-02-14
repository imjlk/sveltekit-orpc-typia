import type { CreatePostInput } from '@repo/shared';
import { dedupeNumbers, trimRequired } from '../../lib/input';

export const normalizeCreatePostInput = (input: CreatePostInput) => {
  const title = trimRequired('Title', input.title);
  const content = trimRequired('Content', input.content);
  const categoryId = input.categoryId ?? null;
  const tagIds = dedupeNumbers(input.tagIds ?? []);

  return {
    title,
    content,
    categoryId,
    tagIds,
  };
};

