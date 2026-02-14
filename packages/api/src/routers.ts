import { implement } from '@orpc/server';
import { contentServiceContract, metaServiceContract } from '@repo/shared';
import { createCategoryRouter } from './modules/category/router';
import { createCommentRouter } from './modules/comment/router';
import { createPostRouter } from './modules/post/router';
import { createTagRouter } from './modules/tag/router';
import type { DbClient } from './types';

const content = implement(contentServiceContract);

export const createContentRouter = (db: DbClient) =>
  content.router({
    post: createPostRouter(db),
    comment: createCommentRouter(db),
  });

export type ContentRouter = ReturnType<typeof createContentRouter>;

const meta = implement(metaServiceContract);

export const createMetaRouter = (db: DbClient) =>
  meta.router({
    category: createCategoryRouter(db),
    tag: createTagRouter(db),
  });

export type MetaRouter = ReturnType<typeof createMetaRouter>;

