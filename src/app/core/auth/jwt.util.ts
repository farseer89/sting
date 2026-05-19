/** Decode JWT `exp` (seconds since epoch) without verifying signature. */
export function decodeJwtExp(token: string): number | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isAccessTokenValid(token: string | null, skewSeconds = 30): boolean {
  if (!token) return false;
  const exp = decodeJwtExp(token);
  if (exp == null) return false;
  return exp * 1000 > Date.now() + skewSeconds * 1000;
}
