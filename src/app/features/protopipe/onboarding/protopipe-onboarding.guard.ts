import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import {
  HOME_DASHBOARD_PATH,
  HOME_ONBOARDING_PATH,
} from '../home/protopipe-home.routes';
import { ProtopipeOnboardingStateService } from './protopipe-onboarding-state.service';

const LEGACY_ONBOARDING_PATH = '/protopipe/onboarding';

function bypassLegacyWizard(): boolean {
  return inject(PRODUCT_CONFIG).onboarding?.bypassLegacyWizard === true;
}

async function onboardingCompleted(): Promise<boolean | null> {
  const onboarding = inject(ProtopipeOnboardingStateService);
  try {
    const boot = await onboarding.load();
    return Boolean(boot.onboardingCompletedAt);
  } catch {
    return null;
  }
}

/**
 * Sends `/home` to dashboard when onboarding is done, otherwise onboarding flow.
 */
export const homeEntryGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const complete = await onboardingCompleted();
  if (complete === true) {
    return router.createUrlTree([HOME_DASHBOARD_PATH]);
  }
  if (complete === false) {
    return router.createUrlTree([HOME_ONBOARDING_PATH]);
  }
  return router.createUrlTree([HOME_ONBOARDING_PATH]);
};

/**
 * Blocks dashboard and discovery until onboarding is complete.
 */
export const requireOnboardingCompleteGuard: CanActivateFn = async (_route, state) => {
  if (state.url.startsWith(LEGACY_ONBOARDING_PATH)) {
    return true;
  }

  const router = inject(Router);
  const complete = await onboardingCompleted();
  if (complete === true) {
    return true;
  }
  if (complete === false) {
    return router.createUrlTree([HOME_ONBOARDING_PATH]);
  }
  return router.createUrlTree([HOME_ONBOARDING_PATH]);
};

/**
 * Onboarding shell is only for accounts that have not finished onboarding.
 */
export const requireOnboardingIncompleteGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const complete = await onboardingCompleted();
  if (complete === true) {
    return router.createUrlTree([HOME_DASHBOARD_PATH]);
  }
  return true;
};

/**
 * Legacy wizard: skip when complete. Discovery-book mode redirects to dashboard.
 */
export const skipWhenOnboardingCompleteGuard: CanActivateFn = async () => {
  const router = inject(Router);

  if (bypassLegacyWizard()) {
    return router.createUrlTree([HOME_DASHBOARD_PATH]);
  }

  const complete = await onboardingCompleted();
  if (complete === true) {
    return router.createUrlTree([HOME_DASHBOARD_PATH]);
  }
  return true;
};
