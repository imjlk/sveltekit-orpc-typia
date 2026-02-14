import { createDb } from '@repo/db';
import { implement } from '@orpc/server';
import { appContract } from '@repo/shared';
import { createCategoryRouter } from './modules/category/router';
import { createCommentRouter } from './modules/comment/router';
import { createPostRouter } from './modules/post/router';
import { createTagRouter } from './modules/tag/router';

const db = createDb();
const app = implement(appContract);

export const appRouter = app.router({
  post: createPostRouter(db),
  comment: createCommentRouter(db),
  category: createCategoryRouter(db),
  tag: createTagRouter(db),
});

export type AppRouter = typeof appRouter;
