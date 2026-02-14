export type ErrorIssue = {
  message: string;
  // Normalized path segments (StandardSchemaV1.PathSegment.key is flattened to its key).
  // Keep it JSON-friendly for transport + OpenAPI.
  path?: Array<string | number>;
};

export type BadRequestData = {
  reason?: string;
  issues?: ErrorIssue[];
};

export type NotFoundData = {
  resource?: string;
  id?: number;
};
