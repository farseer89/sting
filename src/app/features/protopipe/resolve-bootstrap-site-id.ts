import type { ProtopipeBootstrapResponse } from '@hive/contracts';

/** Pick the active site id from bootstrap, ignoring stale primarySiteId values. */
export function resolveBootstrapSiteId(boot: ProtopipeBootstrapResponse): string | null {
  if (boot.primarySiteId && boot.sites.some((s) => s.id === boot.primarySiteId)) {
    return boot.primarySiteId;
  }
  return boot.sites[0]?.id ?? null;
}
