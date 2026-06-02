export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super("BAD_REQUEST", message, 400, details);
  }
}

export class ConfigurationError extends ApiError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super("CONFIGURATION_ERROR", message, 503, details);
  }
}

export class UpstreamApiError extends ApiError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super("UPSTREAM_API_ERROR", message, 502, details);
  }
}
