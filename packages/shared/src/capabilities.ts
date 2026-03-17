export type EdgeGuardMode = 'ratelimit' | 'do';

export type CheckPostCreateLimitInput = {
  key: string;
  route: 'post.create';
  userId: string;
  ip?: string | null;
};

export type CheckPostCreateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
  limit: number;
  remaining: number;
};

export type PostEventMessage = {
  type: 'post.created';
  eventId: string;
  postId: number;
  userId: string;
  createdAt: string;
};
