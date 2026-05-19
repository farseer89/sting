import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** APP_INITIALIZER factory must return a function that returns the async work. */
export function authInitializer(): () => Promise<boolean> {
  return () => inject(AuthService).bootstrapSession();
}
