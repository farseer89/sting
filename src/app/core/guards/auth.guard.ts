import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasValidAccessToken()) {
    return true;
  }

  // Local dev only: browse shell without remote login (never in production builds)
  if (!environment.production && environment.enableDevRoutes) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
