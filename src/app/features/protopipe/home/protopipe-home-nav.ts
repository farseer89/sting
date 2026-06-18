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
  | 'sharpen';

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
      { id: 'books-brand', label: 'Brand book', icon: 'sparkles' },
      { id: 'books-business', label: 'Business details', icon: 'users' },
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
      { id: 'content-writer', label: 'Writer', icon: 'write' },
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

export const PROTOPIPE_HOME_NAV_DEFAULT_OPEN = ['books', 'start', 'content', 'analytics'] as const;
