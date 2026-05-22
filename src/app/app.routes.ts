import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { devRoutesGuard } from './core/guards/dev-routes.guard';
import { guestGuard } from './core/guards/guest.guard';
import { clientAuthGuard } from './features/client-portal/guards/client-auth.guard';
import { operatorOnlyGuard } from './features/client-portal/guards/operator-only.guard';
import { protopipeContentUnsavedGuard } from './features/protopipe/guards/protopipe-content-unsaved.guard';
import { protopipeUnsavedGuard } from './features/protopipe/guards/protopipe-unsaved.guard';

export const routes: Routes = [
  {
    path: 'portal',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'welcome' },
      {
        path: 'welcome',
        loadComponent: () =>
          import('./features/client-portal/welcome/client-portal-welcome.component').then(
            (m) => m.ClientPortalWelcomeComponent,
          ),
      },
      {
        path: 'dashboard',
        canActivate: [clientAuthGuard],
        loadComponent: () =>
          import('./features/client-portal/dashboard/client-portal-dashboard.component').then(
            (m) => m.ClientPortalDashboardComponent,
          ),
      },
    ],
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard, operatorOnlyGuard],
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
        data: { mode: 'create' },
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
        path: 'protopipe/settings',
        loadComponent: () =>
          import('./features/protopipe/settings/protopipe-content-helper.component').then(
            (m) => m.ProtopipeContentHelperComponent,
          ),
      },
      {
        path: 'protopipe/admin/agent',
        loadComponent: () =>
          import('./features/protopipe/admin/protopipe-agent-control.component').then(
            (m) => m.ProtopipeAgentControlComponent,
          ),
      },
      {
        path: 'protopipe/leads',
        loadComponent: () =>
          import('./features/protopipe/leads/protopipe-leads-list.component').then(
            (m) => m.ProtopipeLeadsListComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/components',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-builder-components.component').then(
            (m) => m.SiteBuilderComponentsComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/components/:componentId',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-builder-component-detail.component').then(
            (m) => m.SiteBuilderComponentDetailComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/templates',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-builder-templates.component').then(
            (m) => m.SiteBuilderTemplatesComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/templates/:templateId/preview',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-builder-template-preview.component').then(
            (m) => m.SiteBuilderTemplatePreviewComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/templates/:templateId',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-builder-template-detail.component').then(
            (m) => m.SiteBuilderTemplateDetailComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/add-site',
        loadComponent: () =>
          import('./features/protopipe/site-builder/add-site-wizard.component').then(
            (m) => m.AddSiteWizardComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/sites',
        loadComponent: () =>
          import('./features/protopipe/site-builder/my-sites-list.component').then(
            (m) => m.MySitesListComponent,
          ),
      },
      {
        path: 'protopipe/site-builder/sites/:siteId/edit',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-page-editor.component').then(
            (m) => m.SitePageEditorComponent,
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
