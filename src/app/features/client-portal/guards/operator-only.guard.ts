import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ClientAuthService } from '../client-auth.service';

/** Blocks operator shell when only a client magic-link session is active. */
export const operatorOnlyGuard: CanActivateFn = () => {
  const operatorAuth = inject(AuthService);
  const clientAuth = inject(ClientAuthService);
  const router = inject(Router);

  if (clientAuth.isAuthenticated() && !operatorAuth.hasValidAccessToken()) {
    return router.createUrlTree(['/portal/dashboard']);
  }

  return true;
};
