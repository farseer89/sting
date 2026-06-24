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

const PROTOPIPE_API_ERROR_MESSAGES: Record<string, string> = {
  run_not_ready:
    'Keyword discovery is still running. Wait for it to finish, then try building your plan again.',
  run_not_found:
    'Keyword discovery run not found. Refresh the page and try again.',
  'GEO discovery was run recently. Pass params.force to run again.':
    'Analysis ran recently. Click Run again to refresh results.',
  'GEO discovery was run recently. Use Run again to refresh results.':
    'Analysis ran recently. Click Run again to refresh results.',
};

/** User-safe message from bagend error body — never surface stack traces. */
export function parseProtopipeApiError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiErrorBody | null;
    const validationMessage = firstValidationMessage(body?.errors);
    if (validationMessage) {
      return validationMessage;
    }
    if (typeof body?.message === 'string' && body.message.length > 0) {
      return PROTOPIPE_API_ERROR_MESSAGES[body.message] ?? body.message;
    }
    const errorText = (body as { error?: string } | null)?.error;
    if (typeof errorText === 'string' && errorText.length > 0) {
      return errorText;
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

function firstValidationMessage(
  errors: ApiErrorBody['errors'] | undefined,
): string | null {
  const first = errors?.[0];
  if (!first) return null;
  if (typeof first.message === 'string' && first.message.length > 0) {
    return first.message;
  }
  const legacyMsg = (first as { msg?: string }).msg;
  if (typeof legacyMsg === 'string' && legacyMsg.length > 0 && legacyMsg !== 'Invalid value') {
    return legacyMsg;
  }
  if (typeof first.field === 'string' && first.field.length > 0) {
    return `Invalid ${first.field}`;
  }
  return null;
}
