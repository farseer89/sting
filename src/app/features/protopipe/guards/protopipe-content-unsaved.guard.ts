import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { ProtopipeContentService } from '../protopipe-content.service';

export const protopipeContentUnsavedGuard: CanDeactivateFn<unknown> = () => {
  const content = inject(ProtopipeContentService);
  if (!content.dirty()) {
    return true;
  }
  return window.confirm('You have unsaved changes. Leave without saving?');
};
