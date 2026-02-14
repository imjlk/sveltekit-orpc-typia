export class InvalidCategoryDataError extends Error {
  code = 'BAD_REQUEST' as const;

  constructor(message = 'Invalid category data') {
    super(message);
  }
}

export class CategoryNotFoundError extends Error {
  code = 'NOT_FOUND' as const;

  constructor(message = 'Category not found') {
    super(message);
  }
}

