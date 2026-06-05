import type { VoidWindowId } from './void-dashboard.mock';

export type VoidNavIcon =
  | 'globe'
  | 'compass'
  | 'search'
  | 'list'
  | 'sparkles'
  | 'users'
  | 'sitemap'
  | 'write'
  | 'helper'
  | 'chart'
  | 'inbox'
  | 'link'
  | 'grid'
  | 'box'
  | 'clone'
  | 'palette'
  | 'shield'
  | 'agent'
  | 'book'
  | 'home'
  | 'void';

export interface VoidNavItem {
  id: string;
  label: string;
  icon?: VoidNavIcon;
  window?: VoidWindowId;
  disabled?: boolean;
  separator?: boolean;
  children?: VoidNavItem[];
}

/** Premiere / content calendar shell navigation (void white). */
export const VOID_PREMIERE_NAV: VoidNavItem[] = [
  {
    id: 'start',
    label: 'Get started',
    icon: 'sparkles',
    children: [
      { id: 'start-keywords', label: 'Choose keywords', icon: 'search', window: 'keyword-picker' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'write',
    children: [
      { id: 'content-calendar', label: 'Content calendar', icon: 'grid', window: 'scheduler' },
      { id: 'content-articles', label: 'Articles', icon: 'list', window: 'content' },
      { id: 'content-writer', label: 'Writer', icon: 'write', window: 'writer' },
      { id: 'content-kanban', label: 'Pipeline', icon: 'sitemap', window: 'kanban' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: 'search',
    children: [
      { id: 'seo-keywords', label: 'Keywords', icon: 'list', window: 'keywords' },
      { id: 'seo-spoke', label: 'Content map', icon: 'compass', window: 'spoke' },
      { id: 'seo-serp', label: 'SERP', icon: 'globe', window: 'serp' },
      { id: 'seo-research', label: 'Research', icon: 'sparkles', disabled: true },
      { id: 'seo-competitors', label: 'Competitors', icon: 'users', disabled: true },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'chart',
    children: [
      { id: 'analytics-overview', label: 'Overview', icon: 'chart', window: 'analytics' },
      { id: 'analytics-calendar', label: 'Calendar', icon: 'grid', window: 'calendar' },
    ],
  },
  { id: 'premiere-separator', label: '', separator: true },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'link',
    children: [
      { id: 'int-slack', label: 'Slack', icon: 'inbox', window: 'slack' },
      { id: 'int-mail', label: 'Mail', icon: 'inbox', window: 'mail' },
      { id: 'int-stripe', label: 'Stripe', icon: 'chart', window: 'stripe' },
    ],
  },
];

export const VOID_PREMIERE_DEFAULT_OPEN = ['start', 'content', 'seo'] as const;

export const VOID_PREMIERE_SITE = {
  name: 'destinationweddingpainter.com',
  plan: 'Pro · live',
  user: 'Aubrey M.',
  initials: 'AM',
};

/** Mirrors shell NavigationService groups, mapped to void windows where they exist. */
export const VOID_NAV: VoidNavItem[] = [
  {
    id: 'my-sites',
    label: 'My Sites',
    icon: 'globe',
    children: [
      { id: 'landing-sites', label: 'Landing sites', icon: 'globe', window: 'files' },
      { id: 'my-plan', label: 'My Plan', icon: 'compass', window: 'overview' },
      { id: 'research', label: 'Research', icon: 'search', window: 'serp' },
      { id: 'keywords', label: 'Keywords', icon: 'list', window: 'keywords' },
      { id: 'keywords-discover', label: 'Find keywords', icon: 'sparkles', disabled: true },
      { id: 'keywords-competitors', label: 'Competitors', icon: 'users', disabled: true },
      { id: 'content-plan', label: 'Content Plan', icon: 'sitemap', window: 'kanban' },
      { id: 'content', label: 'Content', icon: 'write', window: 'content' },
      { id: 'writer', label: 'Writer', icon: 'write', window: 'writer' },
      { id: 'content-helper', label: 'Content Helper', icon: 'helper', disabled: true },
      { id: 'analytics', label: 'Analytics', icon: 'chart', window: 'analytics' },
      { id: 'leads', label: 'Leads', icon: 'inbox', window: 'mail' },
      { id: 'integrations', label: 'Integrations', icon: 'link', disabled: true },
    ],
  },
  {
    id: 'site-builder',
    label: 'Site Builder',
    icon: 'grid',
    children: [
      { id: 'sb-components', label: 'Components', icon: 'box', disabled: true },
      { id: 'sb-templates', label: 'Templates', icon: 'clone', disabled: true },
      { id: 'sb-sites', label: 'Sites', icon: 'globe', window: 'files' },
      { id: 'sb-theme', label: 'Theme tokens', icon: 'palette', disabled: true },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'shield',
    children: [
      { id: 'admin-agent', label: 'Agent Control', icon: 'agent', disabled: true },
      { id: 'admin-integrations', label: 'Integrations', icon: 'link', disabled: true },
    ],
  },
  { id: 'dev-separator', label: '', separator: true },
  {
    id: 'dev',
    label: 'Dev',
    icon: 'book',
    children: [
      { id: 'dev-docs', label: 'Dev Docs', icon: 'book', disabled: true },
      { id: 'dev-ui', label: 'UI Playground', icon: 'palette', disabled: true },
      { id: 'dev-void', label: 'Void lab', icon: 'void', window: 'overview' },
    ],
  },
];

export const VOID_NAV_DEFAULT_OPEN = ['my-sites', 'site-builder'] as const;

export const VOID_NAV_SITE = {
  name: 'destinationweddingpainter.com',
  plan: 'Pro · live',
  user: 'Aubrey M.',
  initials: 'AM',
};
