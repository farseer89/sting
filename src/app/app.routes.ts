import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { devRoutesGuard } from './core/guards/dev-routes.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'dev/docs',
        canMatch: [devRoutesGuard],
        loadComponent: () =>
          import('./features/dev-docs/dev-docs.component').then((m) => m.DevDocsComponent),
      },
      {
        path: 'dev/ui',
        canMatch: [devRoutesGuard],
        loadComponent: () =>
          import('./features/dev-ui/dev-ui.component').then((m) => m.DevUiComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
