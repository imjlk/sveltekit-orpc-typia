export type ErrorIssue = {
  message: string;
  // StandardSchema issue paths can contain richer segments; keep this permissive.
  path?: unknown[];
};

export type BadRequestData = {
  reason?: string;
  issues?: ErrorIssue[];
};

export type NotFoundData = {
  resource?: string;
  id?: number;
};

