import type { KeywordIntent, KeywordPriority } from './protopipe.models';

export function intentSeverity(intent: KeywordIntent): 'success' | 'info' | 'warn' {
  switch (intent) {
    case 'transactional':
      return 'success';
    case 'commercial':
      return 'warn';
    default:
      return 'info';
  }
}

export function prioritySeverity(priority: KeywordPriority): 'danger' | 'warn' | 'secondary' {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warn';
    default:
      return 'secondary';
  }
}

export const INTENT_OPTIONS: { label: string; value: KeywordIntent }[] = [
  { label: 'Commercial', value: 'commercial' },
  { label: 'Informational', value: 'informational' },
  { label: 'Transactional', value: 'transactional' },
];

export const PRIORITY_OPTIONS: { label: string; value: KeywordPriority }[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];
