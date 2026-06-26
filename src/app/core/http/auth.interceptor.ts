import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ClientAuthService } from '../../features/client-portal/client-auth.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '@env/environment';
import { isShirePrimary } from '../../features/protopipe/shire/shire-http.util';

function isClientPortalApi(url: string): boolean {
  return url.includes('/api/v2/client/');
}

function isAuthV2Endpoint(url: string): boolean {
  return /\/api\/v2\/auth\/(refresh|signin|logout)(?:\?|$)/.test(url);
}

function isShireAuthEndpoint(url: string): boolean {
  if (!isShirePrimary()) return false;
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout')
  );
}

function reqUrlStartsWith(url: string, base: string): boolean {
  return url.startsWith(base);
}

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const clientAuth = inject(ClientAuthService);
  const apiBase = environment.MICRO_SOCKET_ENDPOINT || environment.MICRO_BASE_URL || '';
  const shireBase = isShirePrimary() ? environment.SHIRE_BASE_URL!.replace(/\/$/, '') : '';
  const isShireApi = !!shireBase && reqUrlStartsWith(req.url, shireBase);
  const isBagendApi = !!apiBase && reqUrlStartsWith(req.url, apiBase);
  const isApi = isBagendApi || isShireApi;
  const isClientApi = isBagendApi && isClientPortalApi(req.url);
  const isPublicShireAuth = isShireAuthEndpoint(req.url);

  const token = isPublicShireAuth
    ? null
    : isClientApi
      ? clientAuth.getToken()
      : auth.getToken();

  const shouldProactiveRefresh =
    auth.hasStoredProfile() &&
    !token &&
    !isPublicShireAuth &&
    !isAuthV2Endpoint(req.url) &&
    ((isShireApi && isShirePrimary()) || (isBagendApi && !isClientApi));

  if (shouldProactiveRefresh) {
    return auth.refreshAccessToken({ silent: true }).pipe(
      switchMap((response) => {
        const newToken = response?.accessToken;
        if (!newToken) {
          return next(req);
        }
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
      }),
      catchError(() => next(req)),
    );
  }

  if (isApi && token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApi) {
        return throwError(() => error);
      }
      if (isPublicShireAuth || isAuthV2Endpoint(req.url)) {
        return throwError(() => error);
      }
      if (isClientApi) {
        clientAuth.clearSession();
        return throwError(() => error);
      }
      if (!auth.hasStoredProfile()) {
        auth.emitSessionExpired();
        return throwError(() => error);
      }
      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);
        return auth.refreshAccessToken({ silent: false }).pipe(
          switchMap((response) => {
            isRefreshing = false;
            const newToken = response?.accessToken;
            if (!newToken) {
              auth.emitSessionExpired();
              return throwError(() => error);
            }
            refreshTokenSubject.next(newToken);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
          }),
          catchError((err) => {
            isRefreshing = false;
            const code = err?.error?.code;
            if (code === 'SESSION_REVOKED') {
              auth.emitSessionRevoked();
            } else {
              auth.emitSessionExpired();
            }
            return throwError(() => err);
          }),
        );
      }
      return refreshTokenSubject.pipe(
        filter((t): t is string => t != null),
        take(1),
        switchMap((t) => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }))),
      );
    }),
  );
};
