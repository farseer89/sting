import { environment } from '../../../../environments/environment';

/** Whether Sting uses Shire as the primary Protopipe API (auth + data). */
export function isShirePrimary(): boolean {
  return Boolean(environment.SHIRE_BASE_URL?.trim());
}

/** @deprecated Use {@link isShirePrimary} */
export function isShireRunsEnabled(): boolean {
  return isShirePrimary();
}

/** Build absolute Shire API URL. */
export function shireApiUrl(path: string): string {
  const base = environment.SHIRE_BASE_URL?.trim();
  if (!base) {
    throw new Error('SHIRE_BASE_URL is not configured');
  }
  const normalized = base.replace(/\/$/, '');
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Build absolute bagend URL for legacy adapters that are not ported to Shire. */
export function legacyProtopipeApiBase(): string {
  return environment.MICRO_BASE_URL.replace(/\/$/, '');
}

/** API base for Protopipe HTTP when Shire is primary, else bagend. */
export function protopipeApiBase(): string {
  if (isShirePrimary()) {
    return environment.SHIRE_BASE_URL!.replace(/\/$/, '');
  }
  return legacyProtopipeApiBase();
}
