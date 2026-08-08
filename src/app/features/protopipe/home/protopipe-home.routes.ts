/** URL paths for the user home shell — keep dashboard separate from discovery/runner. */
export const HOME_ENTRY_PATH = '/home';
export const HOME_DASHBOARD_PATH = '/home/dashboard';
export const HOME_ONBOARDING_PATH = '/home/onboarding';
export const HOME_DISCOVERY_PATH = '/home/discovery';
export const HOME_KEYWORDS_PATH = '/home/keywords';
export const HOME_RANKINGS_PATH = '/home/rankings';
export const HOME_SITE_HEALTH_PATH = '/home/site-health';
export const HOME_ANALYTICS_PATH = '/home/analytics';

export type HomeShellRouteKind =
  | 'entry'
  | 'dashboard'
  | 'onboarding'
  | 'discovery'
  | 'keywords'
  | 'rankings'
  | 'site-health'
  | 'analytics';

export function homeShellRouteKind(path: string): HomeShellRouteKind | null {
  const normalized = path.split('?')[0] ?? '';
  if (normalized === HOME_DASHBOARD_PATH) return 'dashboard';
  if (normalized === HOME_ONBOARDING_PATH) return 'onboarding';
  if (normalized === HOME_DISCOVERY_PATH) return 'discovery';
  if (normalized === HOME_KEYWORDS_PATH) return 'keywords';
  if (normalized === HOME_RANKINGS_PATH) return 'rankings';
  if (normalized === HOME_SITE_HEALTH_PATH) return 'site-health';
  if (normalized === HOME_ANALYTICS_PATH) return 'analytics';
  if (normalized === HOME_ENTRY_PATH) return 'entry';
  return null;
}
