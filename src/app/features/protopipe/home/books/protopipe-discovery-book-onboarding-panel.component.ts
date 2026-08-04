import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostBinding,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import {
  MARKET_REACH_OPTIONS,
  marketReachNeedsCountry,
  marketReachNeedsLocal,
  ONBOARDING_MODE_OPTIONS,
  type MarketReachMode,
} from '../../onboarding/onboarding-market.constants';
import { DiscoveryBookOnboardingStore } from './discovery-book-onboarding.store';
import {
  isFirstOnboardingStep,
  isLastOnboardingStep,
  nextOnboardingStepId,
  type DiscoveryBookOnboardingStepId,
} from './discovery-book-onboarding.steps';
import { ProtopipeDiscoveryBookOnboardingSuggestionsComponent } from './protopipe-discovery-book-onboarding-suggestions.component';

@Component({
  selector: 'app-protopipe-discovery-book-onboarding-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AutoComplete,
    Button,
    InputText,
    ProtopipeDiscoveryBookOnboardingSuggestionsComponent,
  ],
  templateUrl: './protopipe-discovery-book-onboarding-panel.component.html',
  styleUrl: './protopipe-discovery-book-onboarding-panel.component.scss',
})
export class ProtopipeDiscoveryBookOnboardingPanelComponent {
  readonly store = inject(DiscoveryBookOnboardingStore);

  readonly stepId = input.required<DiscoveryBookOnboardingStepId>();
  readonly onboardingCompleted = input(false);
  readonly discoveryStarted = output<string>();
  readonly onboardingFinished = output<string>();
  readonly stepAdvance = output<void>();
  readonly stepBack = output<void>();

  readonly onboardingModeOptions = ONBOARDING_MODE_OPTIONS;
  readonly marketReachOptions = MARKET_REACH_OPTIONS;
  readonly marketReachNeedsLocal = marketReachNeedsLocal;
  readonly marketReachNeedsCountry = marketReachNeedsCountry;

  readonly draft = this.store.draftSnapshot;
  readonly scanUiContext = this.store.scanUiContext;

  @HostBinding('class.kb-onboarding-panel--wizard')
  get wizardPanelHost(): boolean {
    return this.isCoreWizardStep();
  }

  constructor() {
    effect(() => {
      this.stepId();
      this.store.clearStepError();
    });

    effect(() => {
      if (this.stepId() === 'onboarding:market') {
        this.store.ensureMarketDefaults();
      }
    });

    effect(() => {
      if (this.stepId() === 'onboarding:offer') {
        this.store.flushOfferScan();
      }
    });
  }

  isFirstStep(): boolean {
    return isFirstOnboardingStep(this.stepId());
  }

  isLastStep(): boolean {
    return isLastOnboardingStep(this.stepId());
  }

  isCoreWizardStep(): boolean {
    const id = this.stepId();
    return (
      id === 'onboarding:getting-started' ||
      id === 'onboarding:offer' ||
      id === 'onboarding:customers' ||
      id === 'onboarding:competition' ||
      id === 'onboarding:market' ||
      id === 'onboarding:business-name'
    );
  }

  otherServices(): string[] {
    const found = new Set(this.store.siteFoundServices().map((s) => s.toLowerCase()));
    return this.draft().services.filter((s) => !found.has(s.toLowerCase()));
  }

  removeServiceByName(name: string): void {
    const index = this.draft().services.findIndex(
      (s) => s.toLowerCase() === name.toLowerCase(),
    );
    if (index >= 0) {
      this.store.removeService(index);
    }
  }

  avatarSlots(): number[] {
    return this.draft().customerAvatars.map((_, index) => index);
  }

  canAddCustomerAvatar(): boolean {
    return this.store.canAddCustomerAvatar();
  }

  avatarPlaceholder(index: number): string {
    return (
      this.scanUiContext().avatarPlaceholders[index] ?? 'What does this person want?'
    );
  }

  onWebsiteUrlBlur(): void {
    this.store.flushOfferScan();
  }

  onModeKeydown(event: Event, mode: (typeof ONBOARDING_MODE_OPTIONS)[number]['id']): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.store.selectMode(mode);
  }

  onMarketReachKeydown(event: Event, reach: MarketReachMode): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.store.selectMarketReach(reach);
  }

  continue(): void {
    void this.continueAsync();
  }

  private async continueAsync(): Promise<void> {
    if (!this.store.tryContinue(this.stepId())) {
      return;
    }
    if (
      this.stepId() === 'onboarding:getting-started' &&
      this.draft().onboardingMode === 'existing_site'
    ) {
      await this.store.flushOfferScanAndWait();
    }

    if (!this.onboardingCompleted()) {
      const next = nextOnboardingStepId(this.stepId());
      if (!next) return;
      const saved = await this.store.saveStepProgress(this.stepId(), next);
      if (!saved) return;
    }

    this.stepAdvance.emit();
  }

  back(): void {
    this.stepBack.emit();
  }

  async finish(): Promise<void> {
    const runId = await this.store.save();
    if (runId) {
      this.onboardingFinished.emit(runId);
    }
  }

  async saveEdits(): Promise<void> {
    const runId = await this.store.save();
    if (runId) {
      this.discoveryStarted.emit(runId);
    }
  }

  onPrimaryKeydown(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') return;
    event.preventDefault();
    if (!this.onboardingCompleted()) {
      if (this.isLastStep()) {
        void this.finish();
      } else {
        this.continue();
      }
      return;
    }
    if (!this.isLastStep()) {
      this.continue();
    } else if (this.store.canSaveEdits()) {
      void this.saveEdits();
    }
  }

  searchLocations(event: AutoCompleteCompleteEvent): void {
    void this.store.searchLocations(event.query ?? '');
  }

  onLocationSelected(event: AutoCompleteSelectEvent): void {
    this.store.selectLocation(event.value ?? null);
  }

  onLocationCleared(): void {
    this.store.selectLocation(null);
  }

  searchCountries(event: AutoCompleteCompleteEvent): void {
    this.store.searchCountries(event.query ?? '');
  }

  onCountrySelected(event: AutoCompleteSelectEvent): void {
    this.store.selectCountry(event.value ?? null);
  }

  onCountryCleared(): void {
    this.store.selectCountry(null);
  }
}
