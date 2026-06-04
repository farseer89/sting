import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ProtopipeOnboardingStateService } from './protopipe-onboarding-state.service';

const ONBOARDING_PATH = '/protopipe/onboarding';

/**
 * Pushes new accounts into the US-O2 wizard until `onboardingCompletedAt` is set.
 * Once complete, allow normal navigation. If bootstrap fails, allow through —
 * the destination component will surface its own error rather than trapping the user.
 */
export const requireOnboardingCompleteGuard: CanActivateFn = async (_route, state) => {
  if (state.url.startsWith(ONBOARDING_PATH)) {
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
 * send the user to the dashboard.
 */
export const skipWhenOnboardingCompleteGuard: CanActivateFn = async () => {
  const onboarding = inject(ProtopipeOnboardingStateService);
  const router = inject(Router);
  try {
    const boot = await onboarding.load();
    if (boot.onboardingCompletedAt) {
      return router.createUrlTree(['/home']);
    }
  } catch {
    /* fall through to show the wizard */
  }
  return true;
};
