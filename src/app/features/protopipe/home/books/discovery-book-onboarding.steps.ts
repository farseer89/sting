/**
 * Discovery book onboarding nav.
 * The discovery book folds target customer URL examples into the customers step,
 * so it intentionally differs from the standalone onboarding wizard.
 */
export type DiscoveryBookOnboardingStepId =
  | 'onboarding:getting-started'
  | 'onboarding:offer'
  | 'onboarding:customers'
  | 'onboarding:competition'
  | 'onboarding:market'
  | 'onboarding:business-name';

export interface DiscoveryBookOnboardingStepMeta {
  readonly onboardingStep: 1 | 2 | 3 | 4 | 5 | 6;
  readonly id: DiscoveryBookOnboardingStepId;
  readonly navLabel: string;
  readonly kicker: string;
  readonly title: string;
  readonly helper: string;
}

export const DISCOVERY_BOOK_ONBOARDING_STEPS: readonly DiscoveryBookOnboardingStepMeta[] = [
  {
    onboardingStep: 1,
    id: 'onboarding:getting-started',
    navLabel: 'Getting started',
    kicker: 'Getting started',
    title: 'Tell us about your business',
    helper: "We'll help you discover keyword opportunities and content gaps. Choose how you'd like to start.",
  },
  {
    onboardingStep: 2,
    id: 'onboarding:offer',
    navLabel: 'Your offer',
    kicker: 'Your offer',
    title: 'What services are you trying to sell?',
    helper:
      "Some we've pre-filled from your site and industry — remove anything that doesn't fit, then add what's missing.",
  },
  {
    onboardingStep: 3,
    id: 'onboarding:customers',
    navLabel: 'Your customers',
    kicker: 'Your customers',
    title: 'Who are your perfect customers?',
    helper: 'Describe who buys from you. Example customer URLs are optional, but they help enrich discovery.',
  },
  {
    onboardingStep: 4,
    id: 'onboarding:competition',
    navLabel: 'Your competition',
    kicker: 'Your competition',
    title: 'Who are your competitors?',
    helper: "Add competitor sites — then fan out to find others ranking in search.",
  },
  {
    onboardingStep: 5,
    id: 'onboarding:market',
    navLabel: 'Your market',
    kicker: 'Your market',
    title: 'Where are your customers?',
    helper: 'How far your customers reach — local, national, or worldwide.',
  },
  {
    onboardingStep: 6,
    id: 'onboarding:business-name',
    navLabel: 'Last thing',
    kicker: 'Last thing',
    title: "What's the business called?",
    helper: "The name we use across your workspace.",
  },
];

export type DiscoveryBookPipelineSection = 'discovery' | 'keywords' | 'audiences' | 'build';

export type DiscoveryBookSection = DiscoveryBookOnboardingStepId | DiscoveryBookPipelineSection;

export function isOnboardingSection(
  section: DiscoveryBookSection,
): section is DiscoveryBookOnboardingStepId {
  return section.startsWith('onboarding:');
}

export function onboardingStepMeta(
  id: DiscoveryBookOnboardingStepId,
): DiscoveryBookOnboardingStepMeta {
  const meta = DISCOVERY_BOOK_ONBOARDING_STEPS.find((s) => s.id === id);
  if (!meta) {
    throw new Error(`Unknown discovery book onboarding step: ${id}`);
  }
  return meta;
}

export function nextOnboardingStepId(
  id: DiscoveryBookOnboardingStepId,
): DiscoveryBookOnboardingStepId | null {
  const index = DISCOVERY_BOOK_ONBOARDING_STEPS.findIndex((s) => s.id === id);
  if (index < 0 || index >= DISCOVERY_BOOK_ONBOARDING_STEPS.length - 1) {
    return null;
  }
  return DISCOVERY_BOOK_ONBOARDING_STEPS[index + 1].id;
}

export function previousOnboardingStepId(
  id: DiscoveryBookOnboardingStepId,
): DiscoveryBookOnboardingStepId | null {
  const index = DISCOVERY_BOOK_ONBOARDING_STEPS.findIndex((s) => s.id === id);
  if (index <= 0) {
    return null;
  }
  return DISCOVERY_BOOK_ONBOARDING_STEPS[index - 1].id;
}

export function isFirstOnboardingStep(id: DiscoveryBookOnboardingStepId): boolean {
  return DISCOVERY_BOOK_ONBOARDING_STEPS[0]?.id === id;
}

export function isLastOnboardingStep(id: DiscoveryBookOnboardingStepId): boolean {
  return DISCOVERY_BOOK_ONBOARDING_STEPS.at(-1)?.id === id;
}
