export async function reloadSnapshotWithRetry(
  reload: () => Promise<void>,
  hasSnapshot: () => boolean,
  attempts = 5,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await reload();
    if (hasSnapshot()) return true;
    if (attempt < attempts - 1) {
      await sleepMs(750 * (attempt + 1));
    }
  }
  return false;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
