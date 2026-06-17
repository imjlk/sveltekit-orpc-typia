import { implement } from '@orpc/server';
import { appContract } from '@repo/shared';
import { createCategoryRouter } from './modules/category/router';
import { createCommentRouter } from './modules/comment/router';
import { createPostRouter } from './modules/post/router';
import { createTagRouter } from './modules/tag/router';
import { toDbRuntime } from './lib/db-runtime';
import type { AppContext, DbRuntimeInput } from './types';

const app = implement(appContract).$context<AppContext>();

export const createAppRouter = (input: DbRuntimeInput) => {
  const runtime = toDbRuntime(input);

  return app.router({
    post: createPostRouter(runtime),
    comment: createCommentRouter(runtime),
    category: createCategoryRouter(runtime),
    tag: createTagRouter(runtime),
  });
};

export type AppRouter = ReturnType<typeof createAppRouter>;
