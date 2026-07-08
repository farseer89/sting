import { describe, expect, it } from 'vitest';
import { assertBuildBookBaselineGate, validateBuildBookBaselineGate } from './build-book-baseline-gate.util';

describe('build-book-baseline-gate', () => {
  it('passes catalog, skeleton, and baseline assembly checks', () => {
    const result = validateBuildBookBaselineGate();
    expect(result.ok, result.issues.map((i) => i.message).join('\n')).toBe(true);
  });

  it('assertBuildBookBaselineGate does not throw', () => {
    expect(() => assertBuildBookBaselineGate()).not.toThrow();
  });
});
