import type { tags } from 'typia';

export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface CreatePostInput {
  title: string & tags.MinLength<1>;
  content: string & tags.MinLength<1>;
}
