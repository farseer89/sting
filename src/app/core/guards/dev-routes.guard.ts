import { CanMatchFn } from '@angular/router';
import { environment } from '@env/environment';

/** Blocks /dev/* routes in production builds. */
export const devRoutesGuard: CanMatchFn = () => environment.enableDevRoutes;
