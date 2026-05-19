import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBase = environment.MICRO_SOCKET_ENDPOINT || environment.MICRO_BASE_URL || '';
  const isApi = !!apiBase && req.url.startsWith(apiBase);
  const token = auth.getToken();

  if (isApi && token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApi) {
        return throwError(() => error);
      }
      if (!auth.getRefreshToken()) {
        auth.emitSessionExpired();
        return throwError(() => error);
      }
      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);
        return auth.refreshToken().pipe(
          switchMap((response: { tokens?: { accessToken: string } }) => {
            isRefreshing = false;
            const newToken = response?.tokens?.accessToken;
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
          })
        );
      }
      return refreshTokenSubject.pipe(
        filter((t): t is string => t != null),
        take(1),
        switchMap((t) => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } })))
      );
    })
  );
};
