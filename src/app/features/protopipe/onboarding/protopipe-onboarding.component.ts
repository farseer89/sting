import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import type { ProtopipeOnboardingProfile, ProtopipeSerpLocationOption } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeOnboardingStateService } from './protopipe-onboarding-state.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import {
  MARKET_COUNTRIES,
  MARKET_SCOPE_OPTIONS,
  type CustomerMarketScope,
  type MarketCountryOption,
} from './onboarding-market.constants';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 6 as const;

const MAX_SERVICES = 8;
const MAX_COMPETITORS = 3;

@Component({
  selector: 'app-protopipe-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AutoComplete, Button, InputText, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-onboarding.component.html',
  styleUrl: './protopipe-onboarding.component.scss',
})
export class ProtopipeOnboardingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProtopipeApiService);
  private readonly state = inject(ProtopipeOnboardingStateService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  readonly product = inject(PRODUCT_CONFIG);

  readonly totalSteps = TOTAL_STEPS;
  readonly maxServices = MAX_SERVICES;
  readonly maxCompetitors = MAX_COMPETITORS;
  readonly step = signal<Step>(1);
  readonly isSubmitting = signal(false);
  readonly isComplete = signal(false);
  readonly siteId = signal<string | null>(null);
  readonly locationSuggestions = signal<ProtopipeSerpLocationOption[]>([]);
  readonly selectedLocation = signal<ProtopipeSerpLocationOption | null>(null);
  readonly isSearchingLocations = signal(false);

  readonly marketScopeOptions = MARKET_SCOPE_OPTIONS;
  readonly customerScope = signal<CustomerMarketScope | null>(null);
  readonly countrySuggestions = signal<MarketCountryOption[]>([]);
  readonly selectedCountry = signal<MarketCountryOption | null>(null);

  // List-based inputs are tracked as signals (not reactive-form controls) so the
  // chip add/remove UX stays simple; drafts hold the in-progress text entry.
  readonly services = signal<string[]>([]);
  readonly serviceDraft = signal('');
  readonly competitors = signal<string[]>([]);
  readonly competitorDraft = signal('');

  /** Three customer avatars — what each person wants (simple text per slot). */
  readonly avatarSlots = [0, 1, 2] as const;
  readonly customerAvatars = signal<string[]>(['', '', '']);

  readonly form = this.fb.nonNullable.group({
    websiteUrl: ['', [Validators.required, Validators.maxLength(300)]],
    city: ['', [Validators.maxLength(80)]],
    state: ['', [Validators.maxLength(80)]],
    businessName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly progressPercent = computed(() =>
    this.isComplete() ? 100 : Math.round((this.step() / this.totalSteps) * 100),
  );

  readonly summaryChips = computed<readonly { label: string; value: string }[]>(() => {
    const v = this.formValue();
    const chips: { label: string; value: string }[] = [];

    const name = (v.businessName ?? '').trim();
    if (name) chips.push({ label: 'Business', value: name });

    const services = this.services();
    if (services.length > 0) {
      chips.push({ label: 'Services', value: services.join(', ') });
    }

    const avatars = this.customerAvatars().filter((a) => a.trim().length > 0);
    if (avatars.length > 0) {
      const summary =
        avatars.length === 1
          ? avatars[0]
          : `${avatars.length} customer profiles`;
      chips.push({
        label: 'Customers',
        value: summary.length > 60 ? `${summary.slice(0, 57).trimEnd()}…` : summary,
      });
    }

    const competitors = this.competitors();
    if (competitors.length > 0) {
      chips.push({ label: 'Competitors', value: competitors.join(', ') });
    }

    const marketLabel = this.marketSummaryLabel();
    if (marketLabel) chips.push({ label: 'Market', value: marketLabel });

    const url = (v.websiteUrl ?? '').trim();
    if (url) chips.push({ label: 'Site', value: url.replace(/^https?:\/\//i, '') });

    return chips;
  });

  private readonly urlInput = viewChild<ElementRef<HTMLInputElement>>('urlInput');
  private readonly serviceInput = viewChild<ElementRef<HTMLInputElement>>('serviceInput');
  private readonly avatarInput0 = viewChild<ElementRef<HTMLInputElement>>('avatarInput0');
  private readonly competitorInput =
    viewChild<ElementRef<HTMLInputElement>>('competitorInput');
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    effect(() => {
      const s = this.step();
      setTimeout(() => this.focusForStep(s), 50);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const boot = await this.state.load();
      const id = boot.primarySiteId || boot.sites[0]?.id || null;
      this.siteId.set(id);

      const site = boot.sites.find((s) => s.id === id);
      if (site && site.hostname && !site.hostname.endsWith('pending.local')) {
        this.form.controls.websiteUrl.setValue(site.url);
      }
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not load account',
        detail: parseProtopipeApiError(err, 'Refresh and try again.'),
      });
    }
  }

  nextStep(): void {
    const current = this.step();
    if (!this.isStepValid(current)) {
      this.markStepTouched(current);
      this.messages.add({
        severity: 'warn',
        summary: 'Almost there',
        detail: this.stepHint(current),
      });
      return;
    }
    if (current < this.totalSteps) {
      this.step.set((current + 1) as Step);
    }
  }

  previousStep(): void {
    const current = this.step();
    if (current > 1) {
      this.step.set((current - 1) as Step);
    }
  }

  // --- Services chip input ---

  addService(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(this.serviceDraft, this.services, MAX_SERVICES);
  }

  removeService(index: number): void {
    this.services.update((list) => list.filter((_, i) => i !== index));
  }

  onServiceDraftInput(value: string): void {
    this.serviceDraft.set(value);
  }

  // --- Competitor chip input ---

  addCompetitor(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(this.competitorDraft, this.competitors, MAX_COMPETITORS, (v) =>
      v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
    );
  }

  removeCompetitor(index: number): void {
    this.competitors.update((list) => list.filter((_, i) => i !== index));
  }

  onCompetitorDraftInput(value: string): void {
    this.competitorDraft.set(value);
  }

  updateCustomerAvatar(index: number, value: string): void {
    this.customerAvatars.update((list) => {
      const next = [...list];
      next[index] = value.slice(0, 200);
      return next;
    });
  }

  avatarPlaceholder(index: number): string {
    const samples = [
      'Wants a trusted electrician before a kitchen remodel…',
      'Comparing EV charger options for a new home…',
      'Needs emergency help after a panel issue…',
    ];
    return samples[index] ?? 'What does this person want?';
  }

  selectMarketScope(scope: CustomerMarketScope): void {
    this.customerScope.set(scope);
    if (scope === 'local') {
      this.selectedCountry.set(null);
    } else if (scope === 'national') {
      this.selectedLocation.set(null);
      this.form.controls.city.setValue('');
      this.form.controls.state.setValue('');
      this.countrySuggestions.set([...MARKET_COUNTRIES].slice(0, 12));
    } else {
      this.selectedLocation.set(null);
      this.selectedCountry.set(null);
      this.form.controls.city.setValue('');
      this.form.controls.state.setValue('');
    }
  }

  searchCountries(event: AutoCompleteCompleteEvent): void {
    const q = (event.query ?? '').trim().toLowerCase();
    const matches = q
      ? MARKET_COUNTRIES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q),
        )
      : [...MARKET_COUNTRIES];
    this.countrySuggestions.set(matches.slice(0, 12));
  }

  onCountrySelected(event: AutoCompleteSelectEvent): void {
    const option = event.value as MarketCountryOption | null;
    this.selectedCountry.set(option);
  }

  onCountryCleared(): void {
    this.selectedCountry.set(null);
  }

  marketSummaryLabel(): string | null {
    const scope = this.customerScope();
    if (!scope) return null;
    if (scope === 'worldwide') return 'Worldwide';
    if (scope === 'national') return this.selectedCountry()?.name ?? 'National';
    return this.selectedLocation()?.name ?? null;
  }

  private commitDraft(
    draft: WritableSignal<string>,
    list: WritableSignal<string[]>,
    max: number,
    normalize?: (value: string) => string,
  ): void {
    // Support comma-separated paste; add each non-duplicate entry up to the cap.
    const raw = draft();
    const parts = raw
      .split(',')
      .map((p) => (normalize ? normalize(p.trim()) : p.trim()))
      .filter(Boolean);
    if (parts.length === 0) return;
    list.update((current) => {
      const next = [...current];
      for (const part of parts) {
        if (next.length >= max) break;
        if (!next.some((e) => e.toLowerCase() === part.toLowerCase())) {
          next.push(part);
        }
      }
      return next;
    });
    draft.set('');
  }

  async searchLocations(event: AutoCompleteCompleteEvent): Promise<void> {
    const q = event.query?.trim() ?? '';
    if (q.length < 2) {
      this.locationSuggestions.set([]);
      return;
    }
    this.isSearchingLocations.set(true);
    try {
      const res = await this.api.searchSerpLocations(q, 8);
      this.locationSuggestions.set(res.locations);
    } catch {
      this.locationSuggestions.set([]);
    } finally {
      this.isSearchingLocations.set(false);
    }
  }

  onLocationSelected(event: AutoCompleteSelectEvent): void {
    const option = event.value as ProtopipeSerpLocationOption | null;
    if (!option) {
      this.selectedLocation.set(null);
      return;
    }
    this.selectedLocation.set(option);
    const parts = option.name.split(',').map((p) => p.trim());
    if (parts.length >= 1) {
      this.form.controls.city.setValue(parts[0]);
    }
    if (parts.length >= 2) {
      this.form.controls.state.setValue(parts[1]);
    }
  }

  onLocationCleared(): void {
    this.selectedLocation.set(null);
  }

  async submit(): Promise<void> {
    if (this.isSubmitting()) return;
    const siteId = this.siteId();
    if (!siteId) {
      this.messages.add({
        severity: 'error',
        summary: 'No site available',
        detail: 'We could not find your site. Refresh and try again.',
      });
      return;
    }
    // Flush any unconfirmed chip drafts before validating.
    this.addService();
    this.addCompetitor();
    if (!this.form.valid || this.services().length === 0 || !this.isMarketStepValid()) {
      this.form.markAllAsTouched();
      this.step.set(this.firstInvalidStep());
      return;
    }

    this.isSubmitting.set(true);
    const v = this.form.getRawValue();
    const websiteUrl = this.normalizeUrl(v.websiteUrl);
    const scope = this.customerScope();
    const localLocation = this.selectedLocation();
    const country = this.selectedCountry();

    let defaultSerpLocationCode: number | undefined;
    let defaultSerpLocationName: string | undefined;
    let city: string | undefined;
    let state: string | undefined;

    if (scope === 'local' && localLocation) {
      defaultSerpLocationCode = localLocation.code;
      defaultSerpLocationName = localLocation.name;
      city = v.city.trim() || undefined;
      state = v.state.trim() || undefined;
    } else if (scope === 'national' && country) {
      defaultSerpLocationCode = country.code;
      defaultSerpLocationName = country.name;
    }

    const services = this.services();

    try {
      const avatars = this.customerAvatars()
        .map((a) => a.trim())
        .filter(Boolean);

      const profile: ProtopipeOnboardingProfile = {
        services,
        customerAvatars: avatars,
        competitors: this.competitors(),
        marketScope: scope!,
        serpLocationCode: defaultSerpLocationCode,
        serpLocationName: defaultSerpLocationName,
        city,
        state,
        countryIso: country?.iso,
      };

      await this.api.completeOnboarding(siteId, {
        businessName: v.businessName.trim(),
        websiteUrl: websiteUrl || '',
        profile,
      });

      void this.api.startKeywordDiscoveryRun(siteId).catch(() => {
        // Non-blocking — home loads the run when the user enters the app.
      });

      this.state.invalidate();
      this.isSubmitting.set(false);
      this.isComplete.set(true);
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not save',
        detail: parseProtopipeApiError(err, 'Please try again.'),
      });
      this.isSubmitting.set(false);
    }
  }

  async enterApp(): Promise<void> {
    await this.router.navigateByUrl('/home');
  }

  private focusForStep(s: Step): void {
    if (s === 1) this.urlInput()?.nativeElement?.focus();
    else if (s === 2) this.serviceInput()?.nativeElement?.focus();
    else if (s === 3) this.avatarInput0()?.nativeElement?.focus();
    else if (s === 4) this.competitorInput()?.nativeElement?.focus();
    else if (s === 6) this.nameInput()?.nativeElement?.focus();
  }

  private isStepValid(step: Step): boolean {
    const c = this.form.controls;
    switch (step) {
      case 1:
        return c.websiteUrl.valid;
      case 2:
        return this.services().length > 0 || this.serviceDraft().trim().length > 0;
      case 3:
        return this.isAvatarsStepValid();
      case 4:
        return true; // competitors optional
      case 5:
        return this.isMarketStepValid();
      case 6:
        return c.businessName.valid;
    }
  }

  private markStepTouched(step: Step): void {
    const c = this.form.controls;
    if (step === 1) c.websiteUrl.markAsTouched();
    else if (step === 6) c.businessName.markAsTouched();
  }

  private isAvatarsStepValid(): boolean {
    const first = (this.customerAvatars()[0] ?? '').trim();
    return first.length >= 5;
  }

  private isMarketStepValid(): boolean {
    const scope = this.customerScope();
    if (!scope) return false;
    if (scope === 'local') return this.selectedLocation() != null;
    if (scope === 'national') return this.selectedCountry() != null;
    return true;
  }

  private stepHint(step: Step): string {
    if (step === 1) return 'Add your website to continue.';
    if (step === 2) return 'Add at least one service you want to sell.';
    if (step === 3) return 'Describe what at least one customer wants (5+ characters).';
    if (step === 5) {
      const scope = this.customerScope();
      if (!scope) return 'Choose local, national, or worldwide.';
      if (scope === 'local') return 'Pick your town or city to continue.';
      if (scope === 'national') return 'Pick a country to continue.';
      return 'One of the fields above is invalid.';
    }
    if (step === 6) return 'Add your business name to continue.';
    return 'One of the fields above is invalid.';
  }

  private firstInvalidStep(): Step {
    if (!this.form.controls.websiteUrl.valid) return 1;
    if (this.services().length === 0) return 2;
    if (!this.isAvatarsStepValid()) return 3;
    if (!this.isMarketStepValid()) return 5;
    if (!this.form.controls.businessName.valid) return 6;
    return 6;
  }

  private normalizeUrl(raw: string): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }
}
