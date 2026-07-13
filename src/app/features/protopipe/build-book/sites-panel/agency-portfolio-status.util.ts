import type { ProtopipeSite } from '@hive/contracts';

export type AgencyChipTone = 'ok' | 'warn' | 'muted';

export interface AgencyStatusChip {
  id: string;
  label: string;
  tone: AgencyChipTone;
}

export interface AgencySitePortfolioStatus {
  siteId: string;
  chips: AgencyStatusChip[];
  /** Short hint for the primary missing step. */
  nextStep: string | null;
}

export interface AgencySiteStatusSignals {
  keywordCount?: number | null;
  contentPlanComplete?: boolean | null;
  calendarItemCount?: number | null;
  blogPostPageCount?: number | null;
  hasBlogHome?: boolean | null;
}

function chip(id: string, label: string, tone: AgencyChipTone): AgencyStatusChip {
  return { id, label, tone };
}

/** Build portfolio chips for a site from row fields + optional light-fetch signals. */
export function buildAgencySitePortfolioStatus(
  site: ProtopipeSite,
  signals: AgencySiteStatusSignals = {},
): AgencySitePortfolioStatus {
  const slug = site.clientSitesSlug?.trim();
  const chips: AgencyStatusChip[] = [];

  if (slug) {
    chips.push(chip('slug', `Slug · ${slug}`, 'ok'));
  } else {
    chips.push(chip('slug', 'Slug missing', 'warn'));
  }

  if (site.previewBaseUrl || (slug && site.url)) {
    chips.push(chip('live', 'Live URL', 'ok'));
  } else {
    chips.push(chip('live', 'No live URL', 'muted'));
  }

  if (slug) {
    chips.push(chip('publish', 'Publish ready', 'ok'));
  } else {
    chips.push(chip('publish', 'Not publish-ready', 'warn'));
  }

  if (signals.keywordCount == null) {
    chips.push(chip('keywords', 'Keywords · …', 'muted'));
  } else if (signals.keywordCount > 0) {
    chips.push(chip('keywords', `Keywords · ${signals.keywordCount}`, 'ok'));
  } else {
    chips.push(chip('keywords', 'No keywords', 'warn'));
  }

  if (signals.contentPlanComplete == null) {
    chips.push(chip('plan', 'Plan · …', 'muted'));
  } else if (signals.contentPlanComplete) {
    const n = signals.calendarItemCount ?? 0;
    chips.push(chip('plan', n > 0 ? `Plan · ${n} items` : 'Plan complete', 'ok'));
  } else {
    chips.push(chip('plan', 'No plan', 'warn'));
  }

  if (signals.blogPostPageCount == null) {
    chips.push(chip('blog', 'Blog profile · …', 'muted'));
  } else if (signals.blogPostPageCount > 0) {
    chips.push(
      chip(
        'blog',
        signals.hasBlogHome
          ? `Blog · ${signals.blogPostPageCount} posts + home`
          : `Blog · ${signals.blogPostPageCount} posts`,
        'ok',
      ),
    );
  } else {
    chips.push(chip('blog', 'No blog profile', 'warn'));
  }

  let nextStep: string | null = null;
  if (!slug) nextStep = 'Register hosted slug';
  else if ((signals.keywordCount ?? 0) === 0) nextStep = 'Add keywords / run discovery';
  else if (signals.contentPlanComplete === false) nextStep = 'Run content plan';
  else if ((signals.blogPostPageCount ?? 0) === 0) nextStep = 'Add Content Posts from plan';
  else nextStep = 'Publish portable post to Astro';

  return { siteId: site.id, chips, nextStep };
}
