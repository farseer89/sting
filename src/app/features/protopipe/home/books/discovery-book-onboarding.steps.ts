/**
 * Discovery book onboarding nav — manual mirror of protopipe-onboarding wizard steps.
 * Trace: onboarding step N ↔ discoveryBookOnboardingSteps[N - 1].
 */
export type DiscoveryBookOnboardingStepId =
  | 'onboarding:getting-started'
  | 'onboarding:offer'
  | 'onboarding:customers'
  | 'onboarding:ideal-customers'
  | 'onboarding:competition'
  | 'onboarding:market'
  | 'onboarding:business-name';

export interface DiscoveryBookOnboardingStepMeta {
  /** Matches protopipe-onboarding.component step() (1–7). */
  readonly onboardingStep: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly id: DiscoveryBookOnboardingStepId;
  readonly navLabel: string;
  readonly kicker: string;
  readonly title: string;
  readonly helper: string;
}

/** Keep in sync with protopipe-onboarding.component.html step copy. */
export const DISCOVERY_BOOK_ONBOARDING_STEPS: readonly DiscoveryBookOnboardingStepMeta[] = [
  {
    onboardingStep: 1,
    id: 'onboarding:getting-started',
    navLabel: 'Getting started',
    kicker: 'Getting started',
    title: 'How are you starting?',
    helper: "We'll tailor keyword research to your situation.",
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
    helper: 'Describe what each person wants — then add detail to sharpen each profile.',
  },
  {
    onboardingStep: 4,
    id: 'onboarding:ideal-customers',
    navLabel: 'Ideal customers',
    kicker: 'Your ideal customers',
    title: 'Businesses you want to reach',
    helper: "Example companies like the customers you want — we'll scan their sites to learn what they do.",
  },
  {
    onboardingStep: 5,
    id: 'onboarding:competition',
    navLabel: 'Your competition',
    kicker: 'Your competition',
    title: 'Who are your competitors?',
    helper: "Add competitor sites — then fan out to find others ranking in search.",
  },
  {
    onboardingStep: 6,
    id: 'onboarding:market',
    navLabel: 'Your market',
    kicker: 'Your market',
    title: 'Where are your customers?',
    helper: 'How far your customers reach — local, national, or worldwide.',
  },
  {
    onboardingStep: 7,
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
