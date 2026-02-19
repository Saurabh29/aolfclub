/**
 * ApiResult<T> - Universal success/error wrapper
 * Used by all services, actions, and data sources.
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
