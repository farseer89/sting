import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import { ProtopipeOnboardingStateService } from './protopipe-onboarding-state.service';

const ONBOARDING_PATH = '/protopipe/onboarding';
const HOME_PATH = '/home';

function bypassLegacyWizard(): boolean {
  return inject(PRODUCT_CONFIG).onboarding?.bypassLegacyWizard === true;
}

/**
 * Pushes new accounts into the US-O2 wizard until `onboardingCompletedAt` is set.
 * When `bypassLegacyWizard` is enabled, home + Discovery book own onboarding instead.
 */
export const requireOnboardingCompleteGuard: CanActivateFn = async (_route, state) => {
  if (state.url.startsWith(ONBOARDING_PATH)) {
    return true;
  }

  if (bypassLegacyWizard()) {
    return true;
  }

  const onboarding = inject(ProtopipeOnboardingStateService);
  const router = inject(Router);

  try {
    const boot = await onboarding.load();
    if (!boot.onboardingCompletedAt) {
      return router.createUrlTree([ONBOARDING_PATH]);
    }
    return true;
  } catch {
    return true;
  }
};

/**
 * Inverse: if onboarding is already complete, do not show the wizard again —
 * send the user to the dashboard. When bypassing the legacy wizard, always redirect
 * `/protopipe/onboarding` to home (Discovery book).
 */
export const skipWhenOnboardingCompleteGuard: CanActivateFn = async () => {
  const router = inject(Router);

  if (bypassLegacyWizard()) {
    return router.createUrlTree([HOME_PATH]);
  }

  const onboarding = inject(ProtopipeOnboardingStateService);
  try {
    const boot = await onboarding.load();
    if (boot.onboardingCompletedAt) {
      return router.createUrlTree([HOME_PATH]);
    }
  } catch {
    /* fall through to show the wizard */
  }
  return true;
};
