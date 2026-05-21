import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { devRoutesGuard } from './core/guards/dev-routes.guard';
import { guestGuard } from './core/guards/guest.guard';
import { protopipeContentUnsavedGuard } from './features/protopipe/guards/protopipe-content-unsaved.guard';
import { protopipeUnsavedGuard } from './features/protopipe/guards/protopipe-unsaved.guard';

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
      { path: '', pathMatch: 'full', redirectTo: 'protopipe' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      // protopipe — SEO SaaS product (protopipe branch)
      {
        path: 'protopipe',
        loadComponent: () =>
          import('./features/protopipe/dashboard/protopipe-dashboard.component').then(
            (m) => m.ProtopipeDashboardComponent,
          ),
      },
      {
        path: 'protopipe/keywords',
        canDeactivate: [protopipeUnsavedGuard],
        loadComponent: () =>
          import('./features/protopipe/keywords/protopipe-keywords.component').then(
            (m) => m.ProtopipeKeywordsComponent,
          ),
      },
      {
        path: 'protopipe/content',
        loadComponent: () =>
          import('./features/protopipe/content/protopipe-content-list.component').then(
            (m) => m.ProtopipeContentListComponent,
          ),
      },
      {
        path: 'protopipe/content/new',
        canDeactivate: [protopipeContentUnsavedGuard],
        loadComponent: () =>
          import('./features/protopipe/content/protopipe-content-editor.component').then(
            (m) => m.ProtopipeContentEditorComponent,
          ),
      },
      {
        path: 'protopipe/content/:postId',
        canDeactivate: [protopipeContentUnsavedGuard],
        loadComponent: () =>
          import('./features/protopipe/content/protopipe-content-editor.component').then(
            (m) => m.ProtopipeContentEditorComponent,
          ),
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
  { path: '**', redirectTo: 'protopipe' },
];
