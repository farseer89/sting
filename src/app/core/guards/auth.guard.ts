import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasValidAccessToken()) {
    return true;
  }

  // Access token is memory-only; try the httpOnly refresh cookie before login.
  if (auth.hasStoredProfile()) {
    const restored = await auth.bootstrapSession();
    if (restored) {
      return true;
    }
  }

  // Local dev only: browse shell without remote login (never in production builds)
  if (!environment.production && environment.enableDevRoutes) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
