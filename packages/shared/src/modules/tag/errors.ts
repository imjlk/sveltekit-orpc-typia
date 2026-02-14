export class InvalidTagDataError extends Error {
  code = 'BAD_REQUEST' as const;

  constructor(message = 'Invalid tag data') {
    super(message);
  }
}

export class TagNotFoundError extends Error {
  code = 'NOT_FOUND' as const;

  constructor(message = 'Tag not found') {
    super(message);
  }
}

