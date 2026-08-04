import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { devRoutesGuard } from './core/guards/dev-routes.guard';
import { guestGuard } from './core/guards/guest.guard';
import { clientAuthGuard } from './features/client-portal/guards/client-auth.guard';
import { operatorOnlyGuard } from './features/client-portal/guards/operator-only.guard';
import { protopipeContentUnsavedGuard } from './features/protopipe/guards/protopipe-content-unsaved.guard';
import { protopipeUnsavedGuard } from './features/protopipe/guards/protopipe-unsaved.guard';
import {
  homeEntryGuard,
  requireOnboardingCompleteGuard,
  requireOnboardingIncompleteGuard,
  skipWhenOnboardingCompleteGuard,
} from './features/protopipe/onboarding/protopipe-onboarding.guard';

export const routes: Routes = [
  {
    path: 'protopipe/onboarding',
    canActivate: [authGuard, operatorOnlyGuard, skipWhenOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/onboarding/protopipe-onboarding.component').then(
        (m) => m.ProtopipeOnboardingComponent,
      ),
  },
  {
    // Immersive visual sandbox — outside the product shell, dev-only.
    path: 'protopipe/lab/void',
    canMatch: [devRoutesGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/void-dashboard/void-dashboard.component').then(
        (m) => m.VoidDashboardComponent,
      ),
  },
  {
    // Article generation studio — dev-style, real backend, void-writer-shaped UI.
    path: 'protopipe/lab/article-pipeline',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/article-pipeline/article-pipeline.component').then(
        (m) => m.ArticlePipelineComponent,
      ),
  },
  {
    // Intake Studio — admin observability for the SMS/conversation intake system.
    path: 'protopipe/lab/intake-studio',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/intake-studio/intake-studio.component').then(
        (m) => m.IntakeStudioComponent,
      ),
  },
  {
    // Train of Thought — generic agentic-process visualizer (Thinkers/Thoughts).
    // Dev-only lab mockup (no backend), matches the void lab access pattern.
    path: 'protopipe/lab/thinker',
    canMatch: [devRoutesGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/thinker/train-of-thought.component').then(
        (m) => m.TrainOfThoughtComponent,
      ),
  },
  {
    // Keyword Discovery Lab — Thinker view for the discovery pipeline.
    // TODO(pre-launch): revert to devRoutesGuard and remove the home "View run" button.
    path: 'protopipe/lab/keyword-discovery',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/keyword-discovery/keyword-discovery-lab.component').then(
        (m) => m.KeywordDiscoveryLabComponent,
      ),
  },
  {
    // Live Thinker run — renders a real ArticleGenerationRun in the Thought
    // stepper. Operator-gated; opened from the writer's behind-the-curtain panel.
    path: 'protopipe/lab/thinker/run/:siteId/:runId',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/thinker/thinker-run.component').then(
        (m) => m.ThinkerRunComponent,
      ),
  },
  {
    path: 'protopipe/lab/thinker/intake/:siteId/:conversationId',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/thinker/intake-thinker-run.component').then(
        (m) => m.IntakeThinkerRunComponent,
      ),
  },
  {
    path: 'protopipe/lab/article-poc',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/article-poc/article-poc.component').then(
        (m) => m.ArticlePocComponent,
      ),
  },
  {
    // Content plan — void-styled variant kept for lab/aesthetic testing.
    path: 'protopipe/lab/content-plan',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/lab/content-plan/void-content-plan.component').then(
        (m) => m.VoidContentPlanComponent,
      ),
  },
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
    path: 'protopipe/share/project/:token',
    loadComponent: () =>
      import('./features/protopipe/projects/project-share-capture.component').then(
        (m) => m.ProjectShareCaptureComponent,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'signup/success',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/signup/signup-success.component').then((m) => m.SignupSuccessComponent),
  },
  {
    // Thought pack store — product listing (PLP).
    path: 'home/packs/:packId',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/packs',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/leads',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/pitch-prep/:prospectId/wizard',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/pitch-prep',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/brand-setup',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/brand-book/protopipe-brand-setup-wizard.component').then(
        (m) => m.ProtopipeBrandSetupWizardComponent,
      ),
  },
  {
    path: 'home/prospector',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/cold-caller',
    canActivate: [authGuard, operatorOnlyGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/billing',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/dashboard',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/onboarding',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingIncompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: 'home/discovery',
    canActivate: [authGuard, operatorOnlyGuard, requireOnboardingCompleteGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    // User-facing home — redirects to dashboard or onboarding.
    path: 'home',
    canActivate: [authGuard, operatorOnlyGuard, homeEntryGuard],
    loadComponent: () =>
      import('./features/protopipe/home/protopipe-user-home.component').then(
        (m) => m.ProtopipeUserHomeComponent,
      ),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard, operatorOnlyGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: '/home' },
      // protopipe — SEO SaaS product (protopipe branch)
      {
        path: 'protopipe',
        canActivate: [requireOnboardingCompleteGuard],
        loadComponent: () =>
          import('./features/protopipe/dashboard/protopipe-dashboard.component').then(
            (m) => m.ProtopipeDashboardComponent,
          ),
      },
      {
        path: 'protopipe/research',
        loadComponent: () =>
          import('./features/protopipe/research/protopipe-research.component').then(
            (m) => m.ProtopipeResearchComponent,
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
        path: 'protopipe/keywords/discover',
        loadComponent: () =>
          import(
            './features/protopipe/discovery/protopipe-discovery-hub.component'
          ).then((m) => m.ProtopipeDiscoveryHubComponent),
      },
      {
        path: 'protopipe/keywords/discover/diy',
        loadComponent: () =>
          import(
            './features/protopipe/discovery/protopipe-discovery-diy.component'
          ).then((m) => m.ProtopipeDiscoveryDiyComponent),
      },
      {
        path: 'protopipe/keywords/competitors',
        loadComponent: () =>
          import('./features/protopipe/competitors/protopipe-competitors.component').then(
            (m) => m.ProtopipeCompetitorsComponent,
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
        path: 'protopipe/content/calendar',
        loadComponent: () =>
          import(
            './features/protopipe/content/protopipe-content-pipeline-calendar.component'
          ).then((m) => m.ProtopipeContentPipelineCalendarComponent),
      },
      {
        path: 'protopipe/content/plan',
        loadComponent: () =>
          import(
            './features/protopipe/content-plan/protopipe-content-plan.component'
          ).then((m) => m.ProtopipeContentPlanComponent),
      },
      {
        path: 'protopipe/content/packs',
        redirectTo: '/home/packs',
        pathMatch: 'full',
      },
      {
        path: 'protopipe/content/new',
        data: { mode: 'create' },
        canDeactivate: [protopipeContentUnsavedGuard],
        loadComponent: () =>
          import('./features/protopipe/content/writer/protopipe-writer.component').then(
            (m) => m.ProtopipeWriterComponent,
          ),
      },
      {
        path: 'protopipe/content/:postId',
        canDeactivate: [protopipeContentUnsavedGuard],
        loadComponent: () =>
          import('./features/protopipe/content/writer/protopipe-writer.component').then(
            (m) => m.ProtopipeWriterComponent,
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
        path: 'protopipe/settings/integrations',
        loadComponent: () =>
          import('./features/protopipe/settings/protopipe-integrations.component').then(
            (m) => m.ProtopipeIntegrationsComponent,
          ),
      },
      {
        path: 'protopipe/settings/contacts',
        loadComponent: () =>
          import('./features/protopipe/settings/protopipe-contacts.component').then(
            (m) => m.ProtopipeContactsComponent,
          ),
      },
      {
        path: 'protopipe/analytics',
        loadComponent: () =>
          import('./features/protopipe/analytics/protopipe-analytics.component').then(
            (m) => m.ProtopipeAnalyticsComponent,
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
        path: 'protopipe/admin/media-studio',
        loadComponent: () =>
          import('./features/protopipe/admin/media-studio/protopipe-media-studio.component').then(
            (m) => m.ProtopipeMediaStudioComponent,
          ),
      },
      {
        path: 'protopipe/leads',
        redirectTo: '/home/leads',
        pathMatch: 'full',
      },
      {
        path: 'protopipe/pitch-prep/:prospectId/wizard',
        redirectTo: '/home/pitch-prep/:prospectId/wizard',
        pathMatch: 'full',
      },
      {
        path: 'protopipe/pitch-prep',
        redirectTo: '/home/pitch-prep',
        pathMatch: 'full',
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
        path: 'protopipe/site-builder/sites/:siteId/visual',
        loadComponent: () =>
          import('./features/protopipe/site-builder/site-visual-editor.component').then(
            (m) => m.SiteVisualEditorComponent,
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
      {
        path: 'dev/auth',
        canMatch: [devRoutesGuard],
        loadComponent: () =>
          import('./features/dev-auth/dev-auth.component').then((m) => m.DevAuthComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/home' },
];
