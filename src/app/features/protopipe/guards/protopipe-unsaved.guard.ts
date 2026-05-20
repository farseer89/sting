import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

/** Block navigation away from Keywords when there are unsaved edits. */
export const protopipeUnsavedGuard: CanDeactivateFn<unknown> = () => {
  const strategy = inject(ProtopipeStrategyService);
  if (!strategy.dirty()) {
    return true;
  }
  return window.confirm(
    'You have unsaved keyword changes. Leave this page without saving?',
  );
};
