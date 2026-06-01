import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ClientAuthService } from '../../features/client-portal/client-auth.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '@env/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function isClientPortalApi(url: string): boolean {
  return url.includes('/api/v2/client/');
}

/** Never retry refresh/sign-in/logout — avoids a 401 refresh loop in the console. */
function isAuthV2Endpoint(url: string): boolean {
  return /\/api\/v2\/auth\/(refresh|signin|logout)(?:\?|$)/.test(url);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const clientAuth = inject(ClientAuthService);
  const apiBase = environment.MICRO_SOCKET_ENDPOINT || environment.MICRO_BASE_URL || '';
  const isApi = !!apiBase && req.url.startsWith(apiBase);
  const isClientApi = isApi && isClientPortalApi(req.url);
  const token = isClientApi ? clientAuth.getToken() : auth.getToken();

  if (isApi && token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApi) {
        return throwError(() => error);
      }
      if (isAuthV2Endpoint(req.url)) {
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
            auth.emitSessionExpired();
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
