import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthMicroService } from '../auth/auth-micro.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthMicroService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
