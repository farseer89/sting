import { describe, expect, it, vi } from 'vitest';
import { reloadSnapshotWithRetry } from './run-snapshot-reload.util';

describe('reloadSnapshotWithRetry', () => {
  it('retries until a snapshot is available', async () => {
    vi.useFakeTimers();
    const reload = vi
      .fn<() => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    let attempts = 0;
    const hasSnapshot = vi.fn(() => {
      attempts += 1;
      return attempts >= 3;
    });

    const promise = reloadSnapshotWithRetry(reload, hasSnapshot, 5);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
