import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClientAuthService } from '../client-auth.service';

export const clientAuthGuard: CanActivateFn = async () => {
  const auth = inject(ClientAuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/portal/welcome']);
  }

  if (!auth.user()) {
    const ok = await auth.loadMe();
    if (!ok) {
      return router.createUrlTree(['/portal/welcome']);
    }
  }

  return true;
};
