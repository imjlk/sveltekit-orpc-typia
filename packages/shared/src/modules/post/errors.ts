export class PostNotFoundError extends Error {
  code = 'NOT_FOUND' as const;
  constructor(message = 'Post not found') {
    super(message);
  }
}

export class InvalidPostDataError extends Error {
  code = 'BAD_REQUEST' as const;
  constructor(message = 'Invalid post data') {
    super(message);
  }
}
