import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { routes } from './app.routes';
import { authInitializer } from './core/auth/auth.initializer';
import { authInterceptor } from './core/http/auth.interceptor';
import { FieldwavePreset } from './core/theme/fieldwave-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: APP_INITIALIZER, useFactory: authInitializer, multi: true },
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
  ],
};
