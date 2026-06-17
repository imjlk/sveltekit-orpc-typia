import { implement } from '@orpc/server';
import { contentServiceContract, metaServiceContract } from '@repo/shared';
import { createCategoryRouter } from './modules/category/router';
import { createCommentRouter } from './modules/comment/router';
import { createPostRouter } from './modules/post/router';
import { createTagRouter } from './modules/tag/router';
import { toDbRuntime } from './lib/db-runtime';
import type { AppContext, DbRuntimeInput } from './types';

const content = implement(contentServiceContract).$context<AppContext>();

export const createContentRouter = (input: DbRuntimeInput) => {
  const runtime = toDbRuntime(input);

  return content.router({
    post: createPostRouter(runtime),
    comment: createCommentRouter(runtime),
  });
};

export type ContentRouter = ReturnType<typeof createContentRouter>;

const meta = implement(metaServiceContract).$context<AppContext>();

export const createMetaRouter = (input: DbRuntimeInput) => {
  const runtime = toDbRuntime(input);

  return meta.router({
    category: createCategoryRouter(runtime),
    tag: createTagRouter(runtime),
  });
};

export type MetaRouter = ReturnType<typeof createMetaRouter>;
