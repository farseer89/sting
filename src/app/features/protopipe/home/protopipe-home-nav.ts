import type { ProtopipeCapability } from '../access/protopipe-access.model';

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
  locked?: boolean;
  capability?: ProtopipeCapability;
  lockedLabel?: string;
  hiddenWhenLocked?: boolean;
  separator?: boolean;
  children?: ProtopipeHomeNavItem[];
}

/** Premiere-style nav for the user home — structure visible, features wired later. */
export const PROTOPIPE_HOME_NAV: ProtopipeHomeNavItem[] = [
  {
    id: 'home-dashboard',
    label: 'Home',
    icon: 'grid',
  },
  {
    id: 'books',
    label: 'Books',
    icon: 'sparkles',
    children: [
      {
        id: 'books-audience',
        label: 'Audience book',
        icon: 'users',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'books-brand',
        label: 'Brand book',
        icon: 'sparkles',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'books-build',
        label: 'Build book',
        icon: 'globe',
        capability: 'publish',
        hiddenWhenLocked: true,
      },
      {
        id: 'books-ads',
        label: 'Ads book',
        icon: 'search',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'books-research',
        label: 'Research book',
        icon: 'list',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'books-merch',
        label: 'Merch book',
        icon: 'sparkles',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'books-goals',
        label: 'Goals',
        icon: 'sitemap',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
    ],
  },
  {
    id: 'start',
    label: 'Get started',
    icon: 'sparkles',
    children: [
      { id: 'start-keywords', label: 'Discovery book', icon: 'search', capability: 'discovery' },
      { id: 'start-business', label: 'Business book', icon: 'users', capability: 'discovery' },
      { id: 'start-mentions', label: 'AI Mentions book', icon: 'search', capability: 'ai_mentions' },
      { id: 'start-strategy', label: 'Your strategy', icon: 'sitemap', capability: 'strategy' },
      {
        id: 'start-sharpen',
        label: 'Sharpen',
        icon: 'sharpen',
        capability: 'sharpen',
        lockedLabel: 'Advanced',
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'write',
    children: [
      {
        id: 'content-calendar',
        label: 'Content calendar',
        icon: 'grid',
        disabled: true,
        capability: 'content_calendar',
      },
      {
        id: 'content-articles',
        label: 'Articles',
        icon: 'list',
        capability: 'article_generation',
        lockedLabel: 'Pro',
      },
      {
        id: 'content-writer',
        label: 'Writing book',
        icon: 'write',
        capability: 'writer',
        lockedLabel: 'Advanced',
      },
      {
        id: 'content-media-studio',
        label: 'Media Studio',
        icon: 'sparkles',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'content-pitch-prep',
        label: 'Pitch prep',
        icon: 'sparkles',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'content-packs',
        label: 'Thought packs',
        icon: 'sitemap',
        capability: 'content_packs',
        lockedLabel: 'Advanced',
      },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: 'search',
    children: [
      {
        id: 'seo-keywords',
        label: 'Keywords',
        icon: 'list',
        disabled: true,
        capability: 'discovery',
      },
      {
        id: 'seo-competitors',
        label: 'Competitors',
        icon: 'users',
        disabled: true,
        capability: 'discovery',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'chart',
    children: [
      {
        id: 'analytics-leads',
        label: 'Leads',
        icon: 'inbox',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'analytics-overview',
        label: 'Overview',
        icon: 'chart',
        disabled: true,
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'users',
    children: [{ id: 'account-billing', label: 'Billing', icon: 'link' }],
  },
  { id: 'premiere-separator', label: '', separator: true },
  {
    id: 'prospector',
    label: 'Prospector',
    icon: 'search',
    capability: 'admin_internal',
    hiddenWhenLocked: true,
  },
  {
    id: 'cold-caller',
    label: 'Cold Caller',
    icon: 'phone',
    capability: 'admin_internal',
    hiddenWhenLocked: true,
  },
  {
    id: 'dev-runbooks',
    label: 'Runbooks',
    icon: 'list',
    capability: 'admin_internal',
    hiddenWhenLocked: true,
  },
  {
    id: 'dev-thinker',
    label: 'Thinker',
    icon: 'sparkles',
    capability: 'admin_internal',
    hiddenWhenLocked: true,
  },
  {
    id: 'dev-strategy',
    label: 'Strategy',
    icon: 'sitemap',
    capability: 'admin_internal',
    hiddenWhenLocked: true,
  },
  {
    id: 'dev-analytics',
    label: 'Analytics',
    icon: 'chart',
    capability: 'admin_internal',
    hiddenWhenLocked: true,
  },
  {
    id: 'inbox',
    label: 'Inbox',
    icon: 'inbox',
    children: [
      {
        id: 'intake-demo',
        label: 'Intake Demo',
        icon: 'inbox',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'intake-studio',
        label: 'Intake Studio',
        icon: 'inbox',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
      {
        id: 'sms-contacts',
        label: 'SMS Contacts',
        icon: 'phone',
        capability: 'admin_internal',
        hiddenWhenLocked: true,
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'link',
    children: [
      {
        id: 'int-wordpress',
        label: 'WordPress',
        icon: 'link',
        capability: 'publish',
        hiddenWhenLocked: true,
      },
      {
        id: 'int-google',
        label: 'Google',
        icon: 'search',
        capability: 'discovery',
      },
    ],
  },
];

export const PROTOPIPE_HOME_NAV_DEFAULT_OPEN = [
  'books',
  'start',
  'content',
  'analytics',
  'account',
  'inbox',
] as const;
