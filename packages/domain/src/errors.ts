export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not found") {
    super(message, "not_found", 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, "forbidden", 403);
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Conflict") {
    super(message, "conflict", 409);
  }
}

export class UnprocessableError extends DomainError {
  constructor(message: string, code = "unprocessable") {
    super(message, code, 422);
  }
}
