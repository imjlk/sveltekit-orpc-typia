import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { accounts, categories, comments, postActivity, postTags, posts, sessions, tags, users, verifications } from './pg-schema';

export type PgUserRow = InferSelectModel<typeof users>;
export type PgUserInsertRow = InferInsertModel<typeof users>;

export type PgSessionRow = InferSelectModel<typeof sessions>;
export type PgSessionInsertRow = InferInsertModel<typeof sessions>;

export type PgAccountRow = InferSelectModel<typeof accounts>;
export type PgAccountInsertRow = InferInsertModel<typeof accounts>;

export type PgVerificationRow = InferSelectModel<typeof verifications>;
export type PgVerificationInsertRow = InferInsertModel<typeof verifications>;

export type PgPostRow = InferSelectModel<typeof posts>;
export type PgPostInsertRow = InferInsertModel<typeof posts>;

export type PgPostActivityRow = InferSelectModel<typeof postActivity>;
export type PgPostActivityInsertRow = InferInsertModel<typeof postActivity>;

export type PgCommentRow = InferSelectModel<typeof comments>;
export type PgCommentInsertRow = InferInsertModel<typeof comments>;

export type PgCategoryRow = InferSelectModel<typeof categories>;
export type PgCategoryInsertRow = InferInsertModel<typeof categories>;

export type PgTagRow = InferSelectModel<typeof tags>;
export type PgTagInsertRow = InferInsertModel<typeof tags>;

export type PgPostTagRow = InferSelectModel<typeof postTags>;
export type PgPostTagInsertRow = InferInsertModel<typeof postTags>;
