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
  type DiscoveryBookOnboardingStepId,
  type DiscoveryBookPipelineSection,
  type DiscoveryBookSection,
} from './discovery-book-onboarding.steps';
import { DiscoveryBookOnboardingStore } from './discovery-book-onboarding.store';
import { ProtopipeDiscoveryBookOnboardingPanelComponent } from './protopipe-discovery-book-onboarding-panel.component';
import { ProtopipeOnboardingStateService } from '../../onboarding/protopipe-onboarding-state.service';

export type { DiscoveryBookSection };

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
  ],
  templateUrl: './protopipe-home-keyword-book.component.html',
  styleUrl: './protopipe-home-keyword-book.component.scss',
})
export class ProtopipeHomeKeywordBookComponent implements OnInit {
  readonly store = inject(ProtopipeKeywordPickerStore);
  readonly onboardingStore = inject(DiscoveryBookOnboardingStore);
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);
  private readonly onboardingState = inject(ProtopipeOnboardingStateService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly siteLabel = input('');
  readonly confirmed = output<void>();

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
  readonly canUseDiscoveryPipeline = computed(
    () =>
      (this.onboardingState.onboardingCompleted() || this.hasOnboardingProfile()) &&
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
  readonly showKeywordNav = computed(() => this.canUseDiscoveryPipeline());

  readonly showAudiencesNav = computed(
    () =>
      this.canUseDiscoveryPipeline() &&
      (this.store.wizardEnabled() || this.store.wizardStep() !== 'keywords'),
  );

  readonly showBuildNav = computed(
    () => this.canUseDiscoveryPipeline() && this.store.wizardStep() === 'build',
  );

  readonly activeOnboardingMeta = computed(() => {
    const section = this.activeSection();
    if (!isOnboardingSection(section)) return null;
    return onboardingStepMeta(section);
  });

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
      this.loadKeywordStoreWhenReady();

      if (this.didResolveInitialSection()) return;
      this.didResolveInitialSection.set(true);

      if (!this.onboardingState.onboardingCompleted()) {
        this.activeSection.set(DISCOVERY_BOOK_ONBOARDING_STEPS[0].id);
        return;
      }

      const run = this.discoveryRun();
      if (run?.status === 'pending' || run?.status === 'discovering') {
        this.activeSection.set('discovery');
      } else {
        this.activeSection.set('keywords');
      }
    });

    effect(() => {
      const run = this.discoveryRun();
      if (!run) return;
      if (run.status === 'pending' || run.status === 'discovering') {
        this.didAutoLeaveDiscovery.set(false);
        this.activeSection.set('discovery');
        return;
      }
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
    const pipelineAllowed =
      this.canUseDiscoveryPipeline() ||
      (section === 'discovery' && this.hasDiscoveryRun());
    if (!isOnboardingSection(section) && !pipelineAllowed) {
      this.activeSection.set(DISCOVERY_BOOK_ONBOARDING_STEPS[0].id);
      return;
    }
    if (section === 'discovery') {
      this.didAutoLeaveDiscovery.set(true);
    }
    this.activeSection.set(section);
    if (section === 'onboarding:offer') {
      void this.onboardingStore.ensureOfferScan();
    }
    if (!isOnboardingSection(section)) {
      this.syncWizardStep(section);
    }
  }

  onKeywordsConfirmed(): void {
    this.confirmed.emit();
  }

  onDiscoveryStarted(): void {
    this.didAutoLeaveDiscovery.set(false);
    this.activeSection.set('discovery');
  }

  onRerunDiscovery(): void {
    void this.store.rerunDiscovery().then((runId) => {
      if (runId) {
        this.onDiscoveryStarted();
      }
    });
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
    this.didLoadKeywordStore.set(true);
    void this.store.load();
  }
}
