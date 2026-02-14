export class InvalidCommentDataError extends Error {
  code = 'BAD_REQUEST' as const;

  constructor(message = 'Invalid comment data') {
    super(message);
  }
}

export class CommentNotFoundError extends Error {
  code = 'NOT_FOUND' as const;

  constructor(message = 'Comment not found') {
    super(message);
  }
}

