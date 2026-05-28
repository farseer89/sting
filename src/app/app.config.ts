import { APP_INITIALIZER, ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { routes } from './app.routes';
import { authInitializer } from './core/auth/auth.initializer';
import { authInterceptor } from './core/http/auth.interceptor';
import { FieldwavePreset } from './core/theme/fieldwave-preset';
import { ThemeService } from './core/theme/theme.service';
import { PRODUCT_CONFIG } from './core/config/product-config';
import { protopipeProductConfig } from './features/protopipe/config/protopipe-product.config';

/** Touch the ThemeService during bootstrap so its constructor effect runs
 *  before first paint — applies any persisted theme synchronously. */
function themeInitializer(): () => void {
  const theme = inject(ThemeService);
  return () => {
    // Reading `current()` flushes the constructor `effect()` once.
    theme.current();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: APP_INITIALIZER, useFactory: authInitializer, multi: true },
    { provide: APP_INITIALIZER, useFactory: themeInitializer, multi: true },
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: FieldwavePreset,
        options: {
          darkModeSelector: '.app-dark',
          prefix: 'p',
          cssLayer: false,
        },
      },
      ripple: true,
    }),
    MessageService,
    { provide: PRODUCT_CONFIG, useValue: protopipeProductConfig },
  ],
};
