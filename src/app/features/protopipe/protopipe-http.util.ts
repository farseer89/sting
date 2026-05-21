import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody, SeoValidationResult } from '@hive/contracts';
import { environment } from '../../../environments/environment';

const API_BASE = environment.MICRO_BASE_URL;

/** Build absolute v2 Protopipe URL; encodes path params safely. */
export function protopipeApiUrl(pathTemplate: string, params?: Record<string, string>): string {
  let path = pathTemplate;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
  }
  return `${API_BASE}${path}`;
}

/** User-safe message from bagend error body — never surface stack traces. */
export function parseProtopipeApiError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiErrorBody | null;
    if (body?.errors?.[0]?.message) {
      return body.errors[0].message;
    }
    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message;
    }
    if (err.status === 401) {
      return 'Session expired. Sign in again.';
    }
    if (err.status === 403) {
      return 'You do not have access to this resource.';
    }
    if (err.status === 404) {
      return 'Plan not found.';
    }
    if (err.status === 409) {
      const publishBody = body as { message?: string; seoValidation?: SeoValidationResult } | null;
      const seoMsgs = publishBody?.seoValidation?.errors?.map((e) => e.message) ?? [];
      if (seoMsgs.length > 0) {
        const prefix = publishBody?.message ?? 'Cannot publish yet';
        return `${prefix}: ${seoMsgs.join('; ')}`;
      }
      if (typeof publishBody?.message === 'string') {
        return publishBody.message;
      }
    }
  }
  if (err instanceof Error && err.message && !err.message.includes('Http failure')) {
    return err.message;
  }
  return fallback;
}
