import {
  ChangeDetectionStrategy,
  Component,
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
  countryFromDraft,
  locationFromDraft,
} from './discovery-book-onboarding.draft';
import { DiscoveryBookOnboardingStore } from './discovery-book-onboarding.store';
import type { DiscoveryBookOnboardingStepId } from './discovery-book-onboarding.steps';

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
  readonly discoveryStarted = output<string>();

  readonly onboardingModeOptions = ONBOARDING_MODE_OPTIONS;
  readonly marketScopeOptions = MARKET_SCOPE_OPTIONS;

  readonly draft = this.store.draftSnapshot;

  selectedLocation() {
    return locationFromDraft(this.draft());
  }

  selectedCountry() {
    return countryFromDraft(this.draft());
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

  async save(): Promise<void> {
    const runId = await this.store.save(this.stepId());
    if (runId) {
      this.discoveryStarted.emit(runId);
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
