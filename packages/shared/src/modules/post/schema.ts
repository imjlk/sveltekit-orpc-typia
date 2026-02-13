import typia from 'typia';
import type { CreatePostInput, Post } from './types';

const assertCreatePostInput = typia.createAssert<CreatePostInput>();

export const createPostSchema = typia.createValidate<CreatePostInput>();
export const postSchema = typia.createValidate<Post>();
export const postListSchema = typia.createValidate<Post[]>();

export const validateCreatePost = (input: unknown): CreatePostInput => {
  return assertCreatePostInput(input);
};
