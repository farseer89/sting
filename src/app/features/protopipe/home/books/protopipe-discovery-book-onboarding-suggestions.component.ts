import { ChangeDetectionStrategy, Component, HostBinding, computed, inject, input } from '@angular/core';
import { DiscoveryBookOnboardingStore } from './discovery-book-onboarding.store';
import type { DiscoveryBookOnboardingStepId } from './discovery-book-onboarding.steps';

const FALLBACK_CUSTOMER_MOMENTS = [
  'Homeowners with an urgent problem',
  'Customers comparing options before they buy',
  'Businesses planning a larger project',
  'People looking for a trusted local provider',
] as const;

export type DiscoveryBookSuggestionsPlacement = 'inline' | 'help';

@Component({
  selector: 'app-protopipe-discovery-book-onboarding-suggestions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-discovery-book-onboarding-suggestions.component.html',
  styleUrl: './protopipe-discovery-book-onboarding-suggestions.component.scss',
})
export class ProtopipeDiscoveryBookOnboardingSuggestionsComponent {
  readonly stepId = input.required<DiscoveryBookOnboardingStepId>();
  readonly placement = input<DiscoveryBookSuggestionsPlacement>('inline');

  readonly store = inject(DiscoveryBookOnboardingStore);
  readonly draft = this.store.draftSnapshot;

  readonly customerMomentSuggestions = computed(() => {
    const selected = new Set(
      this.draft()
        .customerAvatars.map((avatar) => avatar.trim().toLowerCase())
        .filter(Boolean),
    );
    const suggestions =
      this.store.availableAvatarSuggestions().length > 0
        ? this.store.availableAvatarSuggestions()
        : [...FALLBACK_CUSTOMER_MOMENTS];
    return suggestions.filter((suggestion) => !selected.has(suggestion.trim().toLowerCase()));
  });

  readonly showOfferSuggestions = computed(() => {
    if (this.stepId() !== 'onboarding:offer') return false;
    const draft = this.draft();
    return (
      Boolean(this.store.tradeLabel()) ||
      this.store.availableTradeSuggestions().length > 0 ||
      this.store.availableExpandedSuggestions().length > 0 ||
      (draft.services.length > 0 && draft.services.length < 8)
    );
  });

  readonly showCustomerSuggestions = computed(
    () => this.stepId() === 'onboarding:customers' && this.customerMomentSuggestions().length > 0,
  );

  readonly showCompetitionSuggestions = computed(() => this.stepId() === 'onboarding:competition');

  @HostBinding('class')
  get hostClasses(): string {
    return `kb-discovery-suggestions kb-discovery-suggestions--${this.placement()}`;
  }

  @HostBinding('class.kb-discovery-suggestions--empty')
  get isEmpty(): boolean {
    return !this.showOfferSuggestions() && !this.showCustomerSuggestions() && !this.showCompetitionSuggestions();
  }
}
