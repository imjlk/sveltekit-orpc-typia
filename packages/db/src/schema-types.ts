import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { comments, posts } from "./schema";

export type PostRow = InferSelectModel<typeof posts>;
export type PostInsertRow = InferInsertModel<typeof posts>;

export type CommentRow = InferSelectModel<typeof comments>;
export type CommentInsertRow = InferInsertModel<typeof comments>;
