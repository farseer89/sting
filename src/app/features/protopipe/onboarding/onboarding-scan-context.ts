import type { ProtopipeScanOfferResponse } from '@hive/contracts';
import type { CustomerMarketScope, MarketReachMode } from './onboarding-market.constants';

export interface OnboardingScanUiContext {
  businessNameHint: string | null;
  servicePlaceholder: string;
  avatarPlaceholders: string[];
  competitorPlaceholder: string;
  urlPlaceholder: string;
  stepHelpExamples: StandaloneStepHelpExamples;
  discoveryBookHelpExamples: DiscoveryBookHelpExamples;
}

export type StandaloneStepHelpExamples = Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>;

export type DiscoveryBookHelpExamples = Record<
  | 'onboarding:getting-started'
  | 'onboarding:offer'
  | 'onboarding:customers'
  | 'onboarding:competition'
  | 'onboarding:market'
  | 'onboarding:business-name',
  string
>;

const DEFAULT_AVATAR_PLACEHOLDERS = [
  'Someone comparing options before they buy…',
  'Customer planning a larger project…',
  'Person looking for a trusted local provider…',
] as const;

const DEFAULT_STANDALONE_EXAMPLES: StandaloneStepHelpExamples = {
  1: 'Use your website for an existing business. Choose no website yet for a new idea or offer.',
  2: 'Add the services you actually want more customers to find — remove anything that does not fit.',
  3: 'Describe the buying moment, not a generic persona.',
  4: 'Add a few companies like the customers you want to reach. Skip this for consumer-focused businesses.',
  5: 'Add direct competitors or businesses whose SEO you admire in your market.',
  6: 'Local, national, and worldwide searches behave differently — match where customers buy.',
  7: 'Use your business name for a live company or a project name for a new idea.',
};

const DEFAULT_DISCOVERY_BOOK_EXAMPLES: DiscoveryBookHelpExamples = {
  'onboarding:getting-started': DEFAULT_STANDALONE_EXAMPLES[1],
  'onboarding:offer': DEFAULT_STANDALONE_EXAMPLES[2],
  'onboarding:customers': DEFAULT_STANDALONE_EXAMPLES[3],
  'onboarding:competition': DEFAULT_STANDALONE_EXAMPLES[5],
  'onboarding:market': DEFAULT_STANDALONE_EXAMPLES[6],
  'onboarding:business-name': DEFAULT_STANDALONE_EXAMPLES[7],
};

export function hostnameFromWebsiteUrl(rawUrl: string | undefined): string {
  const url = rawUrl?.trim();
  if (!url) return 'yourbusiness.com';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./i, '');
  } catch {
    return 'yourbusiness.com';
  }
}

function tradeName(tradeLabel: string | null | undefined, services: string[]): string {
  const trade = tradeLabel?.trim();
  if (trade) return trade;
  const first = services[0]?.trim();
  if (first) return first.split(/\s+/).slice(0, 3).join(' ');
  return 'your business';
}

function formatServiceList(services: string[], max = 3): string {
  const items = services.map((s) => s.trim()).filter(Boolean).slice(0, max);
  if (items.length === 0) return 'your core services';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function marketExample(
  service: string,
  reach: MarketReachMode | null | undefined,
  scope: CustomerMarketScope | null | undefined,
): string {
  const label = service.trim() || 'your main service';
  if (reach === 'local_and_national') {
    return `${label} might get 10 searches/month locally and 1,000+ nationwide — we track both.`;
  }
  if (reach === 'local_and_worldwide') {
    return `${label} can differ between your town and global search interest.`;
  }
  if (reach === 'national' || scope === 'national' || scope === 'worldwide') {
    return `${label} may reach customers nationally; some guides still skew local.`;
  }
  if (scope === 'local') {
    return `${label} usually behaves like a local search — customers nearby when they need help.`;
  }
  return 'Nationwide defaults to the United States — add your city for local + nationwide tracking.';
}

function buildStandaloneExamples(input: {
  tradeLabel: string | null;
  services: string[];
  avatars: string[];
  businessNameHint: string | null;
  marketScope: CustomerMarketScope | null | undefined;
  marketReach?: MarketReachMode | null | undefined;
  isStrategyOnly: boolean;
}): StandaloneStepHelpExamples {
  const trade = tradeName(input.tradeLabel, input.services);
  const services = input.services.length > 0 ? input.services : [];
  const offerExample =
    services.length > 0
      ? `A ${trade.toLowerCase()} business might focus on ${formatServiceList(services)}.`
      : input.isStrategyOnly
        ? 'List the services you want to test — these become your keyword seeds.'
        : DEFAULT_STANDALONE_EXAMPLES[2];

  const customerExample =
    input.avatars[0]?.trim() ||
    (services.length > 0
      ? `Customers comparing ${services[0].toLowerCase()} options before they buy.`
      : DEFAULT_STANDALONE_EXAMPLES[3]);

  const competitionExample =
    services.length > 0
      ? `Add nearby or online competitors also offering ${services[0].toLowerCase()}.`
      : DEFAULT_STANDALONE_EXAMPLES[5];

  const marketEx = marketExample(services[0] ?? trade, input.marketReach, input.marketScope);
  const nameExample = input.businessNameHint
    ? `We detected "${input.businessNameHint}" from your site — adjust if needed.`
    : DEFAULT_STANDALONE_EXAMPLES[7];

  return {
    1: DEFAULT_STANDALONE_EXAMPLES[1],
    2: offerExample,
    3: customerExample.endsWith('.') ? customerExample : `${customerExample}`,
    4: DEFAULT_STANDALONE_EXAMPLES[4],
    5: competitionExample,
    6: marketEx,
    7: nameExample,
  };
}

function buildDiscoveryBookExamples(
  standalone: StandaloneStepHelpExamples,
): DiscoveryBookHelpExamples {
  return {
    'onboarding:getting-started': standalone[1],
    'onboarding:offer': standalone[2],
    'onboarding:customers': standalone[3],
    'onboarding:competition': standalone[5],
    'onboarding:market': standalone[6],
    'onboarding:business-name': standalone[7],
  };
}

export function buildOnboardingScanUiContext(input: {
  scan: Pick<
    ProtopipeScanOfferResponse,
    'siteServices' | 'suggestedServices' | 'tradeLabel' | 'customerAvatars' | 'businessNameHint'
  > | null;
  websiteUrl?: string;
  services?: string[];
  tradeLabel?: string | null;
  isStrategyOnly?: boolean;
  marketScope?: CustomerMarketScope | null;
  marketReach?: MarketReachMode | null;
}): OnboardingScanUiContext {
  const services =
    input.services && input.services.length > 0
      ? input.services
      : (input.scan?.siteServices ?? []);
  const tradeLabel = input.tradeLabel ?? input.scan?.tradeLabel ?? null;
  const avatars = input.scan?.customerAvatars ?? [];
  const businessNameHint = input.scan?.businessNameHint?.trim() || null;
  const serviceSeed =
    services[0]?.trim() ||
    input.scan?.suggestedServices?.[0]?.trim() ||
    input.scan?.siteServices?.[0]?.trim() ||
    'your main service';

  const standalone = buildStandaloneExamples({
    tradeLabel,
    services,
    avatars,
    businessNameHint,
    marketScope: input.marketScope ?? null,
    marketReach: input.marketReach ?? null,
    isStrategyOnly: input.isStrategyOnly ?? false,
  });

  const avatarPlaceholders = [
    avatars[0]?.trim() || DEFAULT_AVATAR_PLACEHOLDERS[0],
    avatars[1]?.trim() || DEFAULT_AVATAR_PLACEHOLDERS[1],
    avatars[2]?.trim() || DEFAULT_AVATAR_PLACEHOLDERS[2],
  ];

  const tradeSlug = tradeLabel?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') || 'competitor';

  return {
    businessNameHint,
    servicePlaceholder: serviceSeed.startsWith('your ')
      ? 'e.g. your main service'
      : `e.g. ${serviceSeed.toLowerCase()}`,
    avatarPlaceholders,
    competitorPlaceholder: `e.g. ${tradeSlug}.com`,
    urlPlaceholder: hostnameFromWebsiteUrl(input.websiteUrl),
    stepHelpExamples: standalone,
    discoveryBookHelpExamples: buildDiscoveryBookExamples(standalone),
  };
}
