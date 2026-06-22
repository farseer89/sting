export type ProtopipeHomeNavIcon =
  | 'globe'
  | 'search'
  | 'list'
  | 'sparkles'
  | 'users'
  | 'sitemap'
  | 'write'
  | 'chart'
  | 'inbox'
  | 'link'
  | 'grid'
  | 'sharpen'
  | 'phone';

export interface ProtopipeHomeNavItem {
  id: string;
  label: string;
  icon?: ProtopipeHomeNavIcon;
  disabled?: boolean;
  separator?: boolean;
  children?: ProtopipeHomeNavItem[];
}

/** Premiere-style nav for the user home — structure visible, features wired later. */
export const PROTOPIPE_HOME_NAV: ProtopipeHomeNavItem[] = [
  {
    id: 'books',
    label: 'Books',
    icon: 'sparkles',
    children: [
      { id: 'books-audience', label: 'Audience book', icon: 'users' },
      { id: 'books-brand', label: 'Brand book', icon: 'sparkles' },
      { id: 'books-build', label: 'Build book', icon: 'globe' },
      { id: 'books-ads', label: 'Ads book', icon: 'search' },
      { id: 'books-research', label: 'Research book', icon: 'list' },
      { id: 'books-business', label: 'Business book', icon: 'users' },
      { id: 'books-goals', label: 'Goals', icon: 'sitemap' },
    ],
  },
  {
    id: 'start',
    label: 'Get started',
    icon: 'sparkles',
    children: [
      { id: 'start-keywords', label: 'Choose keywords', icon: 'search' },
      { id: 'start-strategy', label: 'Your strategy', icon: 'sitemap' },
      { id: 'start-sharpen', label: 'Sharpen', icon: 'sharpen' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'write',
    children: [
      { id: 'content-calendar', label: 'Content calendar', icon: 'grid', disabled: true },
      { id: 'content-articles', label: 'Articles', icon: 'list', disabled: true },
      { id: 'content-writer', label: 'Writing book', icon: 'write' },
      { id: 'content-media-studio', label: 'Media Studio', icon: 'sparkles' },
      { id: 'content-pitch-prep', label: 'Pitch prep', icon: 'sparkles' },
      { id: 'content-packs', label: 'Thought packs', icon: 'sitemap' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: 'search',
    children: [
      { id: 'seo-keywords', label: 'Keywords', icon: 'list', disabled: true },
      { id: 'seo-competitors', label: 'Competitors', icon: 'users', disabled: true },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'chart',
    children: [
      { id: 'analytics-leads', label: 'Leads', icon: 'inbox' },
      { id: 'analytics-overview', label: 'Overview', icon: 'chart', disabled: true },
    ],
  },
  { id: 'premiere-separator', label: '', separator: true },
  { id: 'dev-runbooks', label: 'Runbooks', icon: 'list' },
  { id: 'dev-thinker', label: 'Thinker', icon: 'sparkles' },
  { id: 'dev-strategy', label: 'Strategy', icon: 'sitemap' },
  { id: 'dev-analytics', label: 'Analytics', icon: 'chart' },
  {
    id: 'inbox',
    label: 'Inbox',
    icon: 'inbox',
    children: [
      { id: 'intake-demo', label: 'Intake Demo', icon: 'inbox' },
      { id: 'intake-studio', label: 'Intake Studio', icon: 'inbox' },
      { id: 'sms-contacts', label: 'SMS Contacts', icon: 'phone' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'link',
    children: [
      { id: 'int-wordpress', label: 'WordPress', icon: 'link' },
      { id: 'int-google', label: 'Google', icon: 'search' },
    ],
  },
];

export const PROTOPIPE_HOME_NAV_DEFAULT_OPEN = ['books', 'start', 'content', 'analytics', 'inbox'] as const;
