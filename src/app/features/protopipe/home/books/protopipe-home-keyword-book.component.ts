import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ProtopipeHomeThinkerViewState } from '../protopipe-home-thinker-view.state';
import { ProtopipeHomeThinkerBinderComponent } from '../thinker/protopipe-home-thinker-binder.component';
import { ProtopipeKeywordPickerComponent } from '../keyword-picker/protopipe-keyword-picker.component';
import { ProtopipeKeywordSearchPanelComponent } from '../keyword-picker/protopipe-keyword-search-panel.component';
import {
  ProtopipeKeywordPickerStore,
  type KeywordPickerWizardStep,
} from '../keyword-picker/protopipe-keyword-picker.store';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  DISCOVERY_BOOK_ONBOARDING_STEPS,
  isOnboardingSection,
  nextOnboardingStepId,
  onboardingStepMeta,
  previousOnboardingStepId,
  resolveOnboardingResumeStepId,
  type DiscoveryBookOnboardingStepId,
  type DiscoveryBookPipelineSection,
  type DiscoveryBookSection,
} from './discovery-book-onboarding.steps';
import { DiscoveryBookOnboardingStore } from './discovery-book-onboarding.store';
import { ProtopipeDiscoveryBookOnboardingPanelComponent } from './protopipe-discovery-book-onboarding-panel.component';
import { ProtopipeDiscoveryBookOnboardingSuggestionsComponent } from './protopipe-discovery-book-onboarding-suggestions.component';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';
import { PRODUCT_CONFIG } from '../../../../core/config/product-config';

export type { DiscoveryBookSection };

interface DiscoveryBookStepHelp {
  readonly label: string;
  readonly title: string;
  readonly body: string;
  readonly example: string;
}

const DISCOVERY_BOOK_STEP_HELP: Record<DiscoveryBookOnboardingStepId, DiscoveryBookStepHelp> = {
  'onboarding:getting-started': {
    label: 'Start',
    title: 'Start with the strongest signal you have.',
    body:
      'A website lets Discovery scan real pages and pre-fill the next steps. If this is pre-launch, we can still build the strategy from your offer and customer intent.',
    example: 'Use your website for an existing business. Choose no website yet for a new idea or offer.',
  },
  'onboarding:offer': {
    label: 'Offer',
    title: 'Services become seed topics.',
    body:
      'The services you choose tell Discovery which keyword neighborhoods to explore first. Keep only the work you actually want more customers to find.',
    example: 'Add the services you actually want more customers to find.',
  },
  'onboarding:customers': {
    label: 'Customers',
    title: 'Customer moments make keywords sharper.',
    body:
      'Search terms change based on who is searching and what they are trying to do. Describe the buying moment, not a generic persona.',
    example: 'Describe the buying moment, not a generic persona.',
  },
  'onboarding:competition': {
    label: 'Competition',
    title: 'Competitors reveal proven search demand.',
    body:
      'Competitor sites help Discovery find terms that already work in your market. Add direct competitors or businesses whose SEO you admire.',
    example: 'Add direct competitors or businesses whose SEO you admire in your market.',
  },
  'onboarding:market': {
    label: 'Market',
    title: 'Location controls search intent.',
    body:
      'Choose nationwide reach, or compare your local area with national or worldwide demand. Keyword volume can differ sharply by market — we store both when you pick local + nationwide.',
    example: 'Nationwide defaults to the United States; add your town for local + nationwide tracking.',
  },
  'onboarding:business-name': {
    label: 'Name',
    title: 'Name the workspace.',
    body:
      'This name appears across your dashboard and helps keep the generated strategy organized.',
    example: 'Use your business name for a live company or a project name for a new idea.',
  },
};

@Component({
  selector: 'app-protopipe-home-keyword-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DiscoveryBookOnboardingStore],
  imports: [
    ProgressSpinner,
    ProtopipeHomeThinkerBinderComponent,
    ProtopipeKeywordPickerComponent,
    ProtopipeKeywordSearchPanelComponent,
    ProtopipeDiscoveryBookOnboardingPanelComponent,
    ProtopipeDiscoveryBookOnboardingSuggestionsComponent,
  ],
  templateUrl: './protopipe-home-keyword-book.component.html',
  styleUrl: './protopipe-home-keyword-book.component.scss',
})
export class ProtopipeHomeKeywordBookComponent implements OnInit {
  readonly store = inject(ProtopipeKeywordPickerStore);
  readonly onboardingStore = inject(DiscoveryBookOnboardingStore);
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);
  private readonly onboardingState = inject(ProtopipeOnboardingStateService);
  private readonly product = inject(PRODUCT_CONFIG);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly hideDiscoveryBookMasthead = computed(
    () => this.product.onboarding?.hideDiscoveryBookMasthead === true,
  );

  readonly siteLabel = input('');
  readonly confirmed = output<void>();
  readonly onboardingFinished = output<void>();

  readonly onboardingSteps = DISCOVERY_BOOK_ONBOARDING_STEPS;
  readonly activeSection = signal<DiscoveryBookSection>(
    DISCOVERY_BOOK_ONBOARDING_STEPS[0].id,
  );
  private readonly didAutoLeaveDiscovery = signal(false);
  private readonly didResolveInitialSection = signal(false);
  private readonly didLoadKeywordStore = signal(false);

  readonly discoveryRun = this.thinkerView.discoveryRun;

  readonly hasDiscoveryRun = computed(() => Boolean(this.discoveryRun()));
  readonly hasOnboardingProfile = computed(() => Boolean(this.strategy.onboardingProfile()));
  readonly hasMarketBaseline = computed(() => {
    const artifacts = this.discoveryRun()?.artifacts as
      | { marketBaseline?: unknown; marketBaselineReadyAt?: string }
      | undefined;
    return Boolean(artifacts?.marketBaseline || artifacts?.marketBaselineReadyAt);
  });
  readonly keywordResearchReady = computed(() => {
    const run = this.discoveryRun();
    if (!run) return false;
    const artifacts = run.artifacts as
      | { scoredCandidates?: unknown[]; suggestedAvatars?: unknown[] }
      | undefined;
    return (
      run.status === 'ready' ||
      run.status === 'confirmed' ||
      Boolean(artifacts?.scoredCandidates?.length && artifacts?.suggestedAvatars?.length)
    );
  });
  readonly canUseDiscoveryPipeline = computed(
    () =>
      this.onboardingState.onboardingCompleted() &&
      (this.hasOnboardingProfile() || this.hasDiscoveryRun()),
  );

  readonly discoveryStatusLabel = computed(() => {
    const status = this.discoveryRun()?.status;
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'discovering':
        return 'Running';
      case 'ready':
        return 'Ready';
      case 'confirmed':
        return 'Confirmed';
      case 'failed':
        return 'Failed';
      default:
        return 'Not started';
    }
  });

  readonly mastheadStats = computed(() => {
    const parts = [`${this.store.selectedCount()} keywords`];
    if (this.store.wizardEnabled()) {
      parts.push(`${this.store.selectedAvatarCount()} audiences`);
    }
    parts.push(this.discoveryStatusLabel().toLowerCase());
    return parts.join(' · ');
  });

  readonly showDiscoveryNav = computed(() => this.hasDiscoveryRun());
  readonly showKeywordNav = computed(
    () => this.canUseDiscoveryPipeline() && this.keywordResearchReady(),
  );

  /** Audiences confirm moves to the content component later — hide for rankings-first flow. */
  readonly showAudiencesNav = computed(() => false);

  /** Content plan build is deferred until after rankings iteration. */
  readonly showBuildNav = computed(() => false);

  readonly activeOnboardingMeta = computed(() => {
    const section = this.activeSection();
    if (!isOnboardingSection(section)) return null;
    return onboardingStepMeta(section);
  });
  readonly activeStepHelp = computed(() => {
    const section = this.activeSection();
    if (!isOnboardingSection(section)) return null;
    const base = DISCOVERY_BOOK_STEP_HELP[section];
    return {
      ...base,
      example: this.onboardingStore.scanUiContext().discoveryBookHelpExamples[section],
    };
  });
  readonly helpOpen = signal(false);

  constructor() {
    this.thinkerView.setFocusBackLabel('Back to keywords');
    this.thinkerView.setExitHandler(() => this.selectSection('keywords'));

    effect(() => {
      this.strategy.onboardingProfile();
      this.strategy.site();
      this.onboardingState.onboardingCompletionKnown();
      this.onboardingState.onboardingCompleted();
      if (this.strategy.loading()) return;
      if (!this.onboardingState.onboardingCompletionKnown()) return;

      this.onboardingStore.syncFromStrategy();

      if (!this.didResolveInitialSection()) {
        this.didResolveInitialSection.set(true);
        if (!this.onboardingState.onboardingCompleted()) {
          this.activeSection.set(
            resolveOnboardingResumeStepId(this.strategy.onboardingStepId()),
          );
        } else {
          // Completed onboarding opens keyword selection — never auto-enter the runbook.
          // Market Baseline is only opened via explicit user action / Save & rerun.
          this.activeSection.set('keywords');
        }
      }

      this.loadKeywordStoreWhenReady();
    });

    effect(() => {
      if (!this.onboardingState.onboardingCompletionKnown()) return;
      if (!this.onboardingState.onboardingCompleted()) {
        const section = this.activeSection();
        if (!isOnboardingSection(section)) {
          this.activeSection.set(
            resolveOnboardingResumeStepId(this.strategy.onboardingStepId()),
          );
        }
        return;
      }

      // If the user is watching a run and it finishes, move them to keywords once.
      // Do not auto-open Market Baseline when a run becomes pending (finish/onboarding).
      const run = this.discoveryRun();
      if (!run) return;
      if (
        (run.status === 'ready' || run.status === 'confirmed') &&
        this.activeSection() === 'discovery' &&
        !this.didAutoLeaveDiscovery()
      ) {
        this.didAutoLeaveDiscovery.set(true);
        this.activeSection.set('keywords');
      }
    });
  }

  ngOnInit(): void {
    this.onboardingStore.syncFromStrategy();
  }

  selectSection(section: DiscoveryBookSection): void {
    const previous = this.activeSection();
    if (
      !this.onboardingState.onboardingCompleted() &&
      isOnboardingSection(previous) &&
      isOnboardingSection(section) &&
      previous !== section
    ) {
      void this.onboardingStore.saveDraftProgress(previous, section);
    }

    if (!isOnboardingSection(section)) {
      const pipelineAllowed =
        this.canUseDiscoveryPipeline() ||
        (section === 'discovery' &&
          this.onboardingState.onboardingCompleted() &&
          this.hasDiscoveryRun());
      if (!pipelineAllowed) {
        this.activeSection.set(DISCOVERY_BOOK_ONBOARDING_STEPS[0].id);
        return;
      }
    }
    if (section === 'discovery') {
      this.didAutoLeaveDiscovery.set(true);
    }
    this.activeSection.set(section);
    if (section === 'onboarding:offer' && this.onboardingStore.shouldAutoScanOfferOnEntry()) {
      this.onboardingStore.flushOfferScan();
    }
    if (!isOnboardingSection(section)) {
      this.syncWizardStep(section);
      this.loadKeywordStoreWhenReady();
    }
  }

  onKeywordsConfirmed(): void {
    this.confirmed.emit();
  }

  onBookSectionChange(step: KeywordPickerWizardStep): void {
    const sectionByStep: Record<KeywordPickerWizardStep, DiscoveryBookPipelineSection> = {
      keywords: 'keywords',
      avatars: 'audiences',
      build: 'build',
    };
    this.selectSection(sectionByStep[step]);
  }

  onDiscoveryStarted(): void {
    this.didAutoLeaveDiscovery.set(false);
    this.activeSection.set('discovery');
  }

  onOnboardingFinished(): void {
    // Keep the book off the runbook while the shell navigates to the dashboard.
    this.didAutoLeaveDiscovery.set(true);
    this.onboardingFinished.emit();
  }

  onRerunDiscovery(): void {
    void this.store.rerunDiscovery().then((runId) => {
      if (runId) {
        this.onDiscoveryStarted();
      }
    });
  }

  openHelp(): void {
    this.helpOpen.set(true);
  }

  closeHelp(): void {
    this.helpOpen.set(false);
  }

  goToNextOnboardingStep(): void {
    const current = this.activeSection();
    if (!isOnboardingSection(current)) return;
    const next = nextOnboardingStepId(current);
    if (next) {
      this.selectSection(next);
    }
  }

  goToPreviousOnboardingStep(): void {
    const current = this.activeSection();
    if (!isOnboardingSection(current)) return;
    const prev = previousOnboardingStepId(current);
    if (prev) {
      this.selectSection(prev);
    }
  }

  readonly onboardingCompleted = this.onboardingState.onboardingCompleted;

  isOnboardingStepActive(id: DiscoveryBookOnboardingStepId): boolean {
    return this.activeSection() === id;
  }

  isPipelineSectionActive(section: DiscoveryBookPipelineSection): boolean {
    return this.activeSection() === section;
  }

  private syncWizardStep(section: DiscoveryBookPipelineSection): void {
    const map: Record<DiscoveryBookPipelineSection, KeywordPickerWizardStep | null> = {
      discovery: null,
      keywords: 'keywords',
      audiences: 'avatars',
      build: 'build',
    };
    const step = map[section];
    if (step) {
      this.store.setWizardStep(step);
    }
  }

  private loadKeywordStoreWhenReady(): void {
    if (this.didLoadKeywordStore() || !this.canUseDiscoveryPipeline()) return;
    // Avoid the full-book loading spinner during onboarding finish — dashboard
    // loads keyword/discovery state after navigation.
    if (isOnboardingSection(this.activeSection())) return;
    this.didLoadKeywordStore.set(true);
    void this.store.load();
  }
}
