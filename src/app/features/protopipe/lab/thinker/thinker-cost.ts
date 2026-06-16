/** Format USD for Thinker step rails (null when no cost recorded). */
export function formatThinkerCostUsd(n: number | undefined | null): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function sumCosts(values: Array<number | undefined | null>): number | undefined {
  let sum = 0;
  let any = false;
  for (const v of values) {
    if (v != null && Number.isFinite(v)) {
      sum += v;
      any = true;
    }
  }
  return any ? Number(sum.toFixed(4)) : undefined;
}
