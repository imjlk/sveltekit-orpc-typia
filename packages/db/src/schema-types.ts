import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { categories, comments, postTags, posts, tags } from "./schema";

export type PostRow = InferSelectModel<typeof posts>;
export type PostInsertRow = InferInsertModel<typeof posts>;

export type CommentRow = InferSelectModel<typeof comments>;
export type CommentInsertRow = InferInsertModel<typeof comments>;

export type CategoryRow = InferSelectModel<typeof categories>;
export type CategoryInsertRow = InferInsertModel<typeof categories>;

export type TagRow = InferSelectModel<typeof tags>;
export type TagInsertRow = InferInsertModel<typeof tags>;

export type PostTagRow = InferSelectModel<typeof postTags>;
export type PostTagInsertRow = InferInsertModel<typeof postTags>;
