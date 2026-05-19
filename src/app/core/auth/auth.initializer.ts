import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export function authInitializer(): Promise<boolean> {
  return inject(AuthService).bootstrapSession();
}
