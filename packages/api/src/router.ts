import { implement } from '@orpc/server';
import { appContract } from '@repo/shared';
import { createCategoryRouter } from './modules/category/router';
import { createCommentRouter } from './modules/comment/router';
import { createPostRouter } from './modules/post/router';
import { createTagRouter } from './modules/tag/router';
import type { AppContext, DbClient } from './types';

const app = implement(appContract).$context<AppContext>();

export const createAppRouter = (db: DbClient) =>
  app.router({
    post: createPostRouter(db),
    comment: createCommentRouter(db),
    category: createCategoryRouter(db),
    tag: createTagRouter(db),
  });

export type AppRouter = ReturnType<typeof createAppRouter>;
