/**
 * Agency pilot portfolio — hosted Cloudflare sites to register under the admin account.
 * Slugs must match client-sites/sites.registry.json (v2 DWP slug, not destination-wedding-painter).
 */
export interface AgencyPilotSiteSpec {
  id: 'dwp' | 'sparky' | 'wri';
  displayName: string;
  url: string;
  clientSitesSlug: string;
  previewBaseUrl: string;
  /** Build Book starter template that owns this live hosted baseline. */
  buildBookTemplateId: string;
  /** Starter keywords so content-plan can run without a full discovery pass. */
  seedKeywords: readonly string[];
}

export const AGENCY_PILOT_SITES: readonly AgencyPilotSiteSpec[] = [
  {
    id: 'dwp',
    displayName: 'Destination Wedding Painter',
    url: 'https://destinationweddingpainter.com',
    clientSitesSlug: 'destinationweddingpainter',
    previewBaseUrl: 'https://destinationweddingpainter.com',
    buildBookTemplateId: 'veil-live-painter-v1',
    seedKeywords: [
      'destination wedding painter',
      'live wedding painting',
      'wedding painter for destination wedding',
    ],
  },
  {
    id: 'sparky',
    displayName: 'Sparky Electric',
    url: 'https://sparkyelectrichawaii.com',
    clientSitesSlug: 'sparky3',
    previewBaseUrl: 'https://sparkyelectrichawaii.com',
    buildBookTemplateId: 'sparky-electric-trades-v1',
    seedKeywords: ['electrician near me', 'panel upgrade', 'EV charger install'],
  },
  {
    id: 'wri',
    displayName: 'WRI',
    url: 'https://wri-x8q.pages.dev',
    clientSitesSlug: 'wri',
    previewBaseUrl: 'https://wri-x8q.pages.dev',
    buildBookTemplateId: 'wri-field-authority-v1',
    seedKeywords: ['civil engineering firm', 'environmental consulting', 'field services contractor'],
  },
] as const;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeClientSitesSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidClientSitesSlug(value: string): boolean {
  const slug = normalizeClientSitesSlug(value);
  return slug.length >= 1 && slug.length <= 48 && SLUG_RE.test(slug);
}

export function pilotSpecForSlug(slug: string | null | undefined): AgencyPilotSiteSpec | null {
  if (!slug) return null;
  const normalized = normalizeClientSitesSlug(slug);
  return AGENCY_PILOT_SITES.find((p) => p.clientSitesSlug === normalized) ?? null;
}

/** Build Book template that matches a registered hosted pilot slug. */
export function buildBookTemplateIdForSlug(slug: string | null | undefined): string | null {
  return pilotSpecForSlug(slug)?.buildBookTemplateId ?? null;
}
