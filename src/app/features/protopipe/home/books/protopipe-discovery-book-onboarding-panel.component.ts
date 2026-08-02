import {
  ChangeDetectionStrategy,
  Component,
  effect,
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
  MARKET_SCOPE_OPTIONS,
  ONBOARDING_MODE_OPTIONS,
} from '../../onboarding/onboarding-market.constants';
import {
  customerProfileInitials,
  customerProfileSubtitle,
  customerProfileTitle,
} from './discovery-book-customer-profile.util';
import { DiscoveryBookOnboardingStore } from './discovery-book-onboarding.store';
import {
  isFirstOnboardingStep,
  isLastOnboardingStep,
  type DiscoveryBookOnboardingStepId,
} from './discovery-book-onboarding.steps';

@Component({
  selector: 'app-protopipe-discovery-book-onboarding-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoComplete, Button, InputText],
  templateUrl: './protopipe-discovery-book-onboarding-panel.component.html',
  styleUrl: './protopipe-discovery-book-onboarding-panel.component.scss',
})
export class ProtopipeDiscoveryBookOnboardingPanelComponent {
  readonly store = inject(DiscoveryBookOnboardingStore);

  readonly stepId = input.required<DiscoveryBookOnboardingStepId>();
  readonly onboardingCompleted = input(false);
  readonly discoveryStarted = output<string>();
  readonly stepAdvance = output<void>();
  readonly stepBack = output<void>();

  readonly onboardingModeOptions = ONBOARDING_MODE_OPTIONS;
  readonly marketScopeOptions = MARKET_SCOPE_OPTIONS;

  readonly draft = this.store.draftSnapshot;

  constructor() {
    effect(() => {
      if (this.stepId() === 'onboarding:offer') {
        void this.store.ensureOfferScan();
      }
    });

    effect(() => {
      this.stepId();
      this.store.clearStepError();
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
    const samples = [
      'Homeowner wants reliable EV charging at home',
      'Comparing EV charger options for a new build',
      'Needs emergency help after a panel issue',
    ];
    return samples[index] ?? 'What does this person want?';
  }

  isCustomerCardFilled(slot: number): boolean {
    return (this.draft().customerAvatars[slot] ?? '').trim().length > 0;
  }

  customerText(slot: number): string {
    return this.draft().customerAvatars[slot] ?? '';
  }

  profileInitials(slot: number): string {
    return customerProfileInitials(this.customerText(slot));
  }

  profileTitle(slot: number): string {
    return customerProfileTitle(this.customerText(slot), slot);
  }

  profileSubtitle(slot: number): string {
    return customerProfileSubtitle(this.customerText(slot), slot);
  }

  continue(): void {
    if (!this.store.tryContinue(this.stepId())) {
      return;
    }
    this.stepAdvance.emit();
  }

  back(): void {
    this.stepBack.emit();
  }

  async finish(): Promise<void> {
    const runId = await this.store.save();
    if (runId) {
      this.discoveryStarted.emit(runId);
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
