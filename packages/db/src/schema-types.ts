import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { accounts, categories, comments, postActivity, postTags, posts, sessions, tags, users, verifications } from "./schema";

export type UserRow = InferSelectModel<typeof users>;
export type UserInsertRow = InferInsertModel<typeof users>;

export type SessionRow = InferSelectModel<typeof sessions>;
export type SessionInsertRow = InferInsertModel<typeof sessions>;

export type AccountRow = InferSelectModel<typeof accounts>;
export type AccountInsertRow = InferInsertModel<typeof accounts>;

export type VerificationRow = InferSelectModel<typeof verifications>;
export type VerificationInsertRow = InferInsertModel<typeof verifications>;

export type PostRow = InferSelectModel<typeof posts>;
export type PostInsertRow = InferInsertModel<typeof posts>;

export type PostActivityRow = InferSelectModel<typeof postActivity>;
export type PostActivityInsertRow = InferInsertModel<typeof postActivity>;

export type CommentRow = InferSelectModel<typeof comments>;
export type CommentInsertRow = InferInsertModel<typeof comments>;

export type CategoryRow = InferSelectModel<typeof categories>;
export type CategoryInsertRow = InferInsertModel<typeof categories>;

export type TagRow = InferSelectModel<typeof tags>;
export type TagInsertRow = InferInsertModel<typeof tags>;

export type PostTagRow = InferSelectModel<typeof postTags>;
export type PostTagInsertRow = InferInsertModel<typeof postTags>;
