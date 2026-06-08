/**
 * Standard public API envelope used by every Next.js route handler.
 * Shape is always `{ data, error, meta }` so clients can branch on `error`.
 */
export interface ApiError {
  code: string;
  message: string;
  /** HTTP status the route handler should respond with. */
  status: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta: Record<string, unknown>;
}

export function ok<T>(
  data: T,
  meta: Record<string, unknown> = {},
): ApiResponse<T> {
  return { data, error: null, meta };
}

export function fail(
  error: ApiError,
  meta: Record<string, unknown> = {},
): ApiResponse<never> {
  return { data: null, error, meta };
}
