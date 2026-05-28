import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '@hive/contracts';

/** User-safe message from bagend billing error body. */
export function parseBillingApiError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiErrorBody | null;
    if (body?.errors?.[0]?.message) {
      return body.errors[0].message;
    }
    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message;
    }
    if (err.status === 400) {
      return 'Please check your details and try again.';
    }
    if (err.status === 401) {
      return 'Session expired. Sign in again.';
    }
  }
  if (err instanceof Error && err.message && !err.message.includes('Http failure')) {
    return err.message;
  }
  return fallback;
}
