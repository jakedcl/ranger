/** Provider-layer errors for inventory sync (distinct from domain HTTP errors). */

export type ProviderErrorCode =
  | "unauthorized_collection"
  | "throttled"
  | "token_expired"
  | "connection_failed";

export abstract class ProviderError extends Error {
  abstract readonly code: ProviderErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Collection exists but the connection cannot read it (e.g. Graph 403). */
export class UnauthorizedCollection extends ProviderError {
  readonly code = "unauthorized_collection" as const;

  constructor(
    message: string,
    readonly collection?: string,
  ) {
    super(message);
  }
}

/** Graph/provider throttling; honor retryAfterSeconds when present. */
export class Throttled extends ProviderError {
  readonly code = "throttled" as const;

  constructor(
    message: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
  }
}

/** Access token rejected as expired/invalid for the request. */
export class TokenExpired extends ProviderError {
  readonly code = "token_expired" as const;

  constructor(message = "Microsoft access token expired or was rejected") {
    super(message);
  }
}

/** Missing credentials, network failure, or refusal to call live Graph. */
export class ConnectionFailed extends ProviderError {
  readonly code = "connection_failed" as const;

  constructor(message: string) {
    super(message);
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}
