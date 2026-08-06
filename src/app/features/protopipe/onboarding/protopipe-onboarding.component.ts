import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { ActivatedRoute, Router } from '@angular/router';
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
import type {
  ProtopipeFanOutCompetitorSuggestion,
  ProtopipeOnboardingMode,
  ProtopipeOnboardingProfile,
  ProtopipeSerpLocationOption,
} from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeOnboardingStateService } from './protopipe-onboarding-state.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';
import {
  MARKET_COUNTRIES,
  MARKET_SCOPE_OPTIONS,
  ONBOARDING_MODE_OPTIONS,
  type CustomerMarketScope,
  type MarketCountryOption,
  type OnboardingModeId,
} from './onboarding-market.constants';
import { buildOnboardingScanUiContext } from './onboarding-scan-context';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS = 7 as const;

const MAX_SERVICES = 8;
const MAX_COMPETITORS = 3;
const MAX_TARGET_CUSTOMERS = 5;
const MAX_CUSTOMER_AVATARS = 12;

interface AvatarEnrichmentPending {
  original: string;
  enriched: string;
}

interface StepHelpContent {
  label: string;
  title: string;
  body: string;
  example: string;
}

const STEP_HELP: Record<Step, StepHelpContent> = {
  1: {
    label: 'Start',
    title: 'Start with the strongest signal you have.',
    body:
      'A website lets us scan real pages and pre-fill the next steps. If you are pre-launch, we can still build a strategy from your offer and customer intent.',
    example: 'Use your website for an existing business. Choose no website yet for a new idea or offer.',
  },
  2: {
    label: 'Offer',
    title: 'Services become seed topics.',
    body:
      'The services you choose tell Discovery which keyword neighborhoods to explore first. Keep only the work you actually want more customers to find.',
    example: 'Add the services you actually want more customers to find.',
  },
  3: {
    label: 'Customers',
    title: 'Customer moments make the keywords sharper.',
    body:
      'Search terms change based on who is searching and what they are trying to do. Describe the buying moment, not a generic persona.',
    example: 'Describe the buying moment, not a generic persona.',
  },
  4: {
    label: 'Examples',
    title: 'Examples are optional, but useful.',
    body:
      'If you sell to businesses, example customer websites help us understand the kinds of companies you want to reach. Skip this for consumer-focused businesses.',
    example: 'A B2B shop might add restaurants, clinics, or local contractors they want more of.',
  },
  5: {
    label: 'Competition',
    title: 'Competitors reveal proven search demand.',
    body:
      'Competitor sites help Discovery find terms that already work in your market. Add direct competitors or businesses whose SEO you admire.',
    example: 'Add direct competitors or businesses whose SEO you admire in your market.',
  },
  6: {
    label: 'Market',
    title: 'Location controls search intent.',
    body:
      'Local, national, and worldwide searches behave differently. Choose where customers are when they are likely to buy.',
    example: 'Local, national, and worldwide searches behave differently — match where customers buy.',
  },
  7: {
    label: 'Name',
    title: 'Name the workspace.',
    body:
      'This name appears across your dashboard and helps keep the generated strategy organized.',
    example: 'Use your business name for a live company or a project name for a new idea.',
  },
};

const FALLBACK_CUSTOMER_MOMENTS = [
  'Homeowners with an urgent problem',
  'Customers comparing options before they buy',
  'Businesses planning a larger project',
  'People looking for a trusted local provider',
] as const;

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
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly product = inject(PRODUCT_CONFIG);
  private offerScanDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly onboardingModeOptions = ONBOARDING_MODE_OPTIONS;
  readonly onboardingMode = signal<OnboardingModeId | null>(null);
  readonly isStrategyOnly = computed(() => this.onboardingMode() === 'strategy_only');

  readonly totalSteps = TOTAL_STEPS;
  readonly maxServices = MAX_SERVICES;
  readonly maxCompetitors = MAX_COMPETITORS;
  readonly maxTargetCustomers = MAX_TARGET_CUSTOMERS;
  readonly step = signal<Step>(1);
  readonly isSubmitting = signal(false);
  readonly isComplete = signal(false);
  readonly siteId = signal<string | null>(null);
  readonly locationSuggestions = signal<ProtopipeSerpLocationOption[]>([]);
  readonly selectedLocation = signal<ProtopipeSerpLocationOption | null>(null);
  readonly isSearchingLocations = signal(false);
  readonly helpOpen = signal(false);

  readonly marketScopeOptions = MARKET_SCOPE_OPTIONS;
  readonly customerScope = signal<CustomerMarketScope | null>(null);
  readonly countrySuggestions = signal<MarketCountryOption[]>([]);
  readonly selectedCountry = signal<MarketCountryOption | null>(null);

  // List-based inputs are tracked as signals (not reactive-form controls) so the
  // chip add/remove UX stays simple; drafts hold the in-progress text entry.
  readonly services = signal<string[]>([]);
  readonly serviceDraft = signal('');
  readonly offerScanning = signal(false);
  readonly offerScanError = signal<string | null>(null);
  readonly offerScannedUrl = signal('');
  readonly siteFoundServices = signal<string[]>([]);
  readonly tradeLabel = signal<string | null>(null);
  readonly tradeSuggestions = signal<string[]>([]);
  readonly customerAvatarSuggestions = signal<string[]>([]);
  readonly businessNameHint = signal<string | null>(null);
  readonly expandedSuggestions = signal<string[]>([]);
  readonly offerExpanding = signal(false);
  readonly offerExpandError = signal<string | null>(null);
  readonly competitors = signal<string[]>([]);
  readonly competitorDraft = signal('');
  readonly competitorFanOutSuggestions = signal<ProtopipeFanOutCompetitorSuggestion[]>([]);
  readonly competitionFanningOut = signal(false);
  readonly competitionFanOutError = signal<string | null>(null);
  readonly targetCustomerSites = signal<string[]>([]);
  readonly targetCustomerDraft = signal('');
  readonly hostedSiteConnected = signal(false);

  /** Customer avatars — what each person wants (simple text per slot). */
  readonly maxCustomerAvatars = MAX_CUSTOMER_AVATARS;
  readonly customerAvatars = signal<string[]>(['', '', '']);
  readonly avatarEnrichmentPending = signal<Record<number, AvatarEnrichmentPending>>({});
  readonly avatarEnrichingSlot = signal<number | null>(null);
  readonly avatarEnrichError = signal<string | null>(null);

  readonly avatarSlots = computed(() =>
    this.customerAvatars().map((_, index) => index),
  );

  readonly form = this.fb.nonNullable.group({
    websiteUrl: ['', [Validators.maxLength(300)]],
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

  readonly scanUiContext = computed(() =>
    buildOnboardingScanUiContext({
      scan:
        this.offerScannedUrl().trim().length > 0
          ? {
              siteServices: this.siteFoundServices(),
              suggestedServices: this.tradeSuggestions(),
              tradeLabel: this.tradeLabel() ?? undefined,
              customerAvatars: this.customerAvatarSuggestions(),
              businessNameHint: this.businessNameHint() ?? undefined,
            }
          : null,
      websiteUrl: this.formValue().websiteUrl ?? '',
      services: this.services(),
      tradeLabel: this.tradeLabel(),
      isStrategyOnly: this.isStrategyOnly(),
      marketScope: this.customerScope(),
    }),
  );

  readonly copy = computed(() => {
    const strategy = this.isStrategyOnly();
    const ctx = this.scanUiContext();
    return {
      celebrationEyebrow: 'All set',
      celebrationHeadline: strategy
        ? 'Your market strategy is ready.'
        : 'Your SEO workspace is ready.',
      step1Eyebrow: 'Getting started',
      step1Question: 'How are you starting?',
      step1Helper: "We'll tailor keyword research to your situation.",
      step2Question: strategy
        ? 'What would you sell?'
        : 'What services are you trying to sell?',
      step2Helper: strategy
        ? 'Add the services you want to test — these drive your market research.'
        : "Some we've pre-filled from your site and industry — remove anything that doesn't fit, then add what's missing.",
      step4Question: 'Businesses you want to reach',
      step4Helper:
        "Add a few companies like the customers you want — e.g. acme-engineering.com. We'll scan their sites to learn what they do.",
      step5Question: strategy ? 'Who would you compete with?' : 'Who are your competitors?',
      step5Helper: strategy
        ? "Add at least one competitor site. We'll learn from the keywords they rank for."
        : "Add a few competitor sites (or ones you admire). We'll mine the keywords they already rank for. Optional, but it makes your suggestions much sharper.",
      step5Footer: strategy
        ? 'Add at least 1 to continue.'
        : 'Add up to {{max}}, or skip with Continue.',
      step7Question: strategy
        ? 'What should we call this project?'
        : "What's the business called?",
      step7Helper: strategy
        ? "We'll use this name across your workspace."
        : "We'll use this name across your dashboard.",
      step7Placeholder: strategy
        ? ctx.businessNameHint
          ? `${ctx.businessNameHint} project`
          : 'Your project name'
        : ctx.businessNameHint ?? 'Your business name',
      submitLabel: strategy ? 'Build my strategy' : 'Find my keywords',
    };
  });

  readonly scheduleCallUrl = computed(() => this.product.scheduleCallUrl?.trim() || '');
  readonly currentStepHelp = computed(() => {
    const step = this.step();
    const base = STEP_HELP[step];
    return {
      ...base,
      example: this.scanUiContext().stepHelpExamples[step],
    };
  });
  readonly serviceInputPlaceholder = computed(() => this.scanUiContext().servicePlaceholder);
  readonly competitorInputPlaceholder = computed(
    () => this.scanUiContext().competitorPlaceholder,
  );
  readonly websiteUrlPlaceholder = computed(() => this.scanUiContext().urlPlaceholder);
  readonly currentStepLabel = computed(() => this.currentStepHelp().label);
  readonly customerMomentSuggestions = computed(() => {
    const used = new Set(
      this.customerAvatars()
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
    );
    const source =
      this.customerAvatarSuggestions().length > 0
        ? this.customerAvatarSuggestions()
        : [...FALLBACK_CUSTOMER_MOMENTS];
    return source.filter((item) => !used.has(item.trim().toLowerCase())).slice(0, 6);
  });

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

    const targetCustomers = this.targetCustomerSites();
    if (targetCustomers.length > 0) {
      chips.push({ label: 'Target examples', value: targetCustomers.join(', ') });
    }

    const competitors = this.competitors();
    if (competitors.length > 0) {
      chips.push({ label: 'Competitors', value: competitors.join(', ') });
    }

    const marketLabel = this.marketSummaryLabel();
    if (marketLabel) chips.push({ label: 'Market', value: marketLabel });

    const url = (v.websiteUrl ?? '').trim();
    if (url && !this.isStrategyOnly()) {
      chips.push({ label: 'Site', value: url.replace(/^https?:\/\//i, '') });
    }

    return chips;
  });

  private readonly urlInput = viewChild<ElementRef<HTMLInputElement>>('urlInput');
  private readonly serviceInput = viewChild<ElementRef<HTMLInputElement>>('serviceInput');
  private readonly avatarInput0 = viewChild<ElementRef<HTMLInputElement>>('avatarInput0');
  private readonly targetCustomerInput =
    viewChild<ElementRef<HTMLInputElement>>('targetCustomerInput');
  private readonly competitorInput =
    viewChild<ElementRef<HTMLInputElement>>('competitorInput');
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    effect(() => {
      const s = this.step();
      setTimeout(() => this.focusForStep(s), 50);
      if (s === 2 && this.shouldAutoScanOfferOnEntry()) {
        this.flushOfferScan();
      }
    });

    effect(() => {
      const url = (this.formValue().websiteUrl ?? '').trim();
      const scanned = this.offerScannedUrl();
      if (scanned && !this.hasCurrentOfferScan(url)) {
        this.invalidateOfferScan();
      }
    });

    effect(() => {
      const mode = this.onboardingMode();
      const url = (this.formValue().websiteUrl ?? '').trim();
      if (mode !== 'existing_site' || !url) return;
      if (this.offerScanDebounce) clearTimeout(this.offerScanDebounce);
      this.offerScanDebounce = setTimeout(() => void this.ensureOfferScan(), 700);
    });

    this.destroyRef.onDestroy(() => {
      if (this.offerScanDebounce) clearTimeout(this.offerScanDebounce);
    });
  }

  async ngOnInit(): Promise<void> {
    const startParam = this.route.snapshot.queryParamMap.get('start');
    if (startParam === 'strategy') {
      this.selectMode('strategy_only');
    }

    try {
      const boot = await this.state.load();
      const id = boot.primarySiteId || boot.sites[0]?.id || null;
      this.siteId.set(id);

      const site = boot.sites.find((s) => s.id === id);
      if (site && site.hostname && !site.hostname.endsWith('pending.local')) {
        this.selectMode('existing_site');
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
      if (current === 1 && this.onboardingMode() === 'existing_site') {
        this.flushOfferScan();
      }
      this.step.set((current + 1) as Step);
    }
  }

  previousStep(): void {
    const current = this.step();
    if (current > 1) {
      this.step.set((current - 1) as Step);
    }
  }

  openHelp(): void {
    this.helpOpen.set(true);
  }

  closeHelp(): void {
    this.helpOpen.set(false);
  }

  selectModeFromKeyboard(event: KeyboardEvent, mode: OnboardingModeId): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.selectMode(mode);
  }

  selectMarketScopeFromKeyboard(event: KeyboardEvent, scope: CustomerMarketScope): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.selectMarketScope(scope);
  }

  selectMode(mode: OnboardingModeId): void {
    this.onboardingMode.set(mode);
    this.invalidateOfferScan();
    const urlControl = this.form.controls.websiteUrl;
    if (mode === 'existing_site') {
      urlControl.setValidators([Validators.required, Validators.maxLength(300)]);
    } else {
      urlControl.clearValidators();
      urlControl.setValue('');
      urlControl.setValidators([Validators.maxLength(300)]);
    }
    urlControl.updateValueAndValidity();
  }

  // --- Services chip input ---

  addService(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(this.serviceDraft, this.services, MAX_SERVICES);
  }

  addSuggestedService(service: string): void {
    const label = service.trim();
    if (!label) return;
    this.services.update((list) => {
      if (list.length >= MAX_SERVICES) return list;
      if (list.some((s) => s.toLowerCase() === label.toLowerCase())) return list;
      return [...list, label];
    });
  }

  siteFoundInServices(): string[] {
    const found = new Set(this.siteFoundServices().map((s) => s.toLowerCase()));
    return this.services().filter((s) => found.has(s.toLowerCase()));
  }

  otherServices(): string[] {
    const found = new Set(this.siteFoundServices().map((s) => s.toLowerCase()));
    return this.services().filter((s) => !found.has(s.toLowerCase()));
  }

  availableTradeSuggestions(): string[] {
    const selected = new Set(this.services().map((s) => s.toLowerCase()));
    return this.tradeSuggestions().filter((s) => !selected.has(s.toLowerCase()));
  }

  availableExpandedSuggestions(): string[] {
    const selected = new Set(this.services().map((s) => s.toLowerCase()));
    return this.expandedSuggestions().filter((s) => !selected.has(s.toLowerCase()));
  }

  canExpandServices(): boolean {
    return (
      this.services().length > 0 &&
      this.services().length < MAX_SERVICES &&
      !this.offerExpanding()
    );
  }

  expandExcludeList(): string[] {
    return Array.from(
      new Set([...this.services(), ...this.tradeSuggestions(), ...this.expandedSuggestions()]),
    );
  }

  async expandServices(): Promise<void> {
    const selected = this.services();
    if (selected.length === 0 || selected.length >= MAX_SERVICES) return;

    const siteId = this.siteId();
    if (!siteId) {
      this.offerExpandError.set('No site loaded.');
      return;
    }

    this.offerExpanding.set(true);
    this.offerExpandError.set(null);

    try {
      const res = await this.api.expandOffer(siteId, {
        selectedServices: selected,
        tradeLabel: this.tradeLabel() ?? undefined,
        websiteUrl: (this.form.controls.websiteUrl.value ?? '').trim() || undefined,
        exclude: this.expandExcludeList(),
      });

      if (res.error === 'llm_not_configured') {
        this.offerExpandError.set('Expand needs AI configured on the server.');
        return;
      }
      if (res.error && res.expandedServices.length === 0) {
        this.offerExpandError.set('Could not expand services right now — try again.');
        return;
      }

      if (res.expandedServices.length > 0) {
        this.expandedSuggestions.update((current) =>
          Array.from(new Set([...current, ...res.expandedServices])),
        );
      } else {
        this.offerExpandError.set('No new related services found — try adjusting your selection.');
      }
    } catch (err) {
      this.offerExpandError.set(parseProtopipeApiError(err, 'Could not expand services.'));
    } finally {
      this.offerExpanding.set(false);
    }
  }

  availableAvatarSuggestions(): string[] {
    const used = new Set(
      this.customerAvatars()
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
    );
    return this.customerAvatarSuggestions().filter((s) => !used.has(s.trim().toLowerCase()));
  }

  applyAvatarSuggestion(text: string): void {
    const value = text.trim();
    if (value.length < 5) return;

    this.customerAvatars.update((avatars) => {
      const next = [...avatars];
      const emptyIndex = next.findIndex((a) => !a.trim());
      if (emptyIndex >= 0) {
        next[emptyIndex] = value;
        return next;
      }
      if (next.length >= MAX_CUSTOMER_AVATARS) return next;
      return [...next, value];
    });
  }

  removeServiceByName(name: string): void {
    const index = this.services().findIndex((s) => s.toLowerCase() === name.toLowerCase());
    if (index >= 0) {
      this.removeService(index);
    }
  }

  invalidateOfferScan(): void {
    this.offerScannedUrl.set('');
    this.siteFoundServices.set([]);
    this.tradeLabel.set(null);
    this.tradeSuggestions.set([]);
    this.customerAvatarSuggestions.set([]);
    this.businessNameHint.set(null);
    this.expandedSuggestions.set([]);
    this.offerExpandError.set(null);
    this.offerScanError.set(null);
  }

  onWebsiteUrlBlur(): void {
    this.flushOfferScan();
  }

  shouldAutoScanOfferOnEntry(): boolean {
    const url = (this.form.controls.websiteUrl.value ?? '').trim();
    return (
      this.onboardingMode() === 'existing_site' &&
      url.length > 0 &&
      this.services().length === 0 &&
      !this.hasCurrentOfferScan(url)
    );
  }

  flushOfferScan(): void {
    if (this.offerScanDebounce) {
      clearTimeout(this.offerScanDebounce);
      this.offerScanDebounce = null;
    }
    void this.ensureOfferScan();
  }

  async ensureOfferScan(): Promise<void> {
    if (this.isStrategyOnly()) return;

    const url = (this.form.controls.websiteUrl.value ?? '').trim();
    if (!url) {
      this.offerScanError.set('Add your website on step 1 to scan services.');
      return;
    }

    if (this.hasCurrentOfferScan(url) && !this.offerScanning()) {
      return;
    }
    if (this.offerScanning()) {
      return;
    }

    const siteId = this.siteId();
    if (!siteId) {
      this.offerScanError.set('No site loaded.');
      return;
    }

    this.offerScanning.set(true);
    this.offerScanError.set(null);

    try {
      const res = await this.api.scanOffer(siteId, {
        websiteUrl: this.normalizeUrl(url),
      });
      this.offerScannedUrl.set(this.normalizeUrl(url));
      this.siteFoundServices.set(res.siteServices);
      this.tradeLabel.set(res.tradeLabel ?? null);
      this.tradeSuggestions.set(res.suggestedServices ?? res.tradeSuggestions ?? []);
      this.customerAvatarSuggestions.set(res.customerAvatars ?? []);
      this.businessNameHint.set(res.businessNameHint?.trim() || null);

      if (res.businessNameHint?.trim() && !this.form.controls.businessName.value?.trim()) {
        this.form.controls.businessName.setValue(res.businessNameHint.trim());
      }

      if (res.error === 'llm_not_configured') {
        this.offerScanError.set(
          'Site scan needs AI configured on the server — showing page headings only.',
        );
      }

      if (res.siteServices.length > 0 && this.services().length === 0) {
        this.services.set(res.siteServices.slice(0, MAX_SERVICES));
      }

      const suggestions = res.customerAvatars ?? [];
      if (suggestions.length > 0) {
        this.customerAvatars.update((avatars) => {
          const next = [...avatars];
          let changed = false;
          for (let i = 0; i < suggestions.length && i < next.length; i += 1) {
            if (!next[i]?.trim()) {
              next[i] = suggestions[i];
              changed = true;
            }
          }
          return changed ? next : avatars;
        });
      }
    } catch (err) {
      this.offerScanError.set(parseProtopipeApiError(err, 'Could not scan your website.'));
    } finally {
      this.offerScanning.set(false);
    }
  }

  removeService(index: number): void {
    this.services.update((list) => list.filter((_, i) => i !== index));
  }

  onServiceDraftInput(value: string): void {
    this.serviceDraft.set(value);
  }

  // --- Target customer chip input ---

  addTargetCustomer(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(
      this.targetCustomerDraft,
      this.targetCustomerSites,
      MAX_TARGET_CUSTOMERS,
      (v) => v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
    );
  }

  removeTargetCustomer(index: number): void {
    this.targetCustomerSites.update((list) => list.filter((_, i) => i !== index));
  }

  onTargetCustomerDraftInput(value: string): void {
    this.targetCustomerDraft.set(value);
  }

  // --- Competitor chip input ---

  addCompetitor(event?: Event): void {
    event?.preventDefault();
    this.commitDraft(this.competitorDraft, this.competitors, MAX_COMPETITORS, (v) =>
      v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
    );
  }

  addSuggestedCompetitor(domain: string): void {
    const label = domain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
    if (!label) return;
    this.competitors.update((list) => {
      if (list.length >= MAX_COMPETITORS) return list;
      if (list.some((c) => c.toLowerCase() === label)) return list;
      return [...list, label];
    });
  }

  availableCompetitorFanOutSuggestions(): ProtopipeFanOutCompetitorSuggestion[] {
    const selected = new Set(this.competitors().map((c) => c.toLowerCase()));
    return this.competitorFanOutSuggestions().filter(
      (suggestion) => !selected.has(suggestion.domain.toLowerCase()),
    );
  }

  canFanOutCompetition(): boolean {
    return (
      this.competitors().length > 0 &&
      this.competitors().length < MAX_COMPETITORS &&
      !this.competitionFanningOut()
    );
  }

  competitionFanOutExcludeList(): string[] {
    return Array.from(
      new Set([
        ...this.competitors(),
        ...this.competitorFanOutSuggestions().map((suggestion) => suggestion.domain),
      ]),
    );
  }

  async fanOutCompetition(): Promise<void> {
    const selected = this.competitors();
    if (selected.length === 0 || selected.length >= MAX_COMPETITORS) return;

    const siteId = this.siteId();
    if (!siteId) {
      this.competitionFanOutError.set('No site loaded.');
      return;
    }

    this.competitionFanningOut.set(true);
    this.competitionFanOutError.set(null);

    try {
      const res = await this.api.fanOutCompetition(siteId, {
        selectedCompetitors: selected,
        services: this.services(),
        tradeLabel: this.tradeLabel() ?? undefined,
        websiteUrl: (this.form.controls.websiteUrl.value ?? '').trim() || undefined,
        marketScope: this.customerScope() ?? undefined,
        serpLocationCode: this.selectedLocation()?.code ?? this.selectedCountry()?.code,
        serpLocationName: this.selectedLocation()?.name ?? this.selectedCountry()?.name,
        exclude: this.competitionFanOutExcludeList(),
      });

      if (res.error === 'dataforseo_not_configured') {
        this.competitionFanOutError.set('Fan out needs DataForSEO configured on the server.');
        return;
      }
      if (res.error === 'no_ranking_competitors_found') {
        this.competitionFanOutError.set(
          'No ranking competitors found for your site and market yet.',
        );
        return;
      }
      if (res.error && res.suggestions.length === 0) {
        this.competitionFanOutError.set('Could not look up ranking competitors right now — try again.');
        return;
      }

      if (res.suggestions.length > 0) {
        this.competitorFanOutSuggestions.update((current) => {
          const byDomain = new Map(current.map((suggestion) => [suggestion.domain.toLowerCase(), suggestion]));
          for (const suggestion of res.suggestions) {
            byDomain.set(suggestion.domain.toLowerCase(), suggestion);
          }
          return Array.from(byDomain.values());
        });
      } else {
        this.competitionFanOutError.set(
          'No new ranking competitors found — try adjusting who you added first.',
        );
      }
    } catch (err) {
      this.competitionFanOutError.set(parseProtopipeApiError(err, 'Could not fan out competitors.'));
    } finally {
      this.competitionFanningOut.set(false);
    }
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
    this.clearAvatarEnrichment(index);
  }

  avatarEnrichmentFor(index: number): AvatarEnrichmentPending | null {
    return this.avatarEnrichmentPending()[index] ?? null;
  }

  canEnrichCustomerAvatar(index: number): boolean {
    const text = (this.customerAvatars()[index] ?? '').trim();
    return (
      text.length >= 5 &&
      this.avatarEnrichmentFor(index) == null &&
      this.avatarEnrichingSlot() !== index
    );
  }

  private clearAvatarEnrichment(index: number): void {
    this.avatarEnrichmentPending.update((pending) => {
      if (!(index in pending)) return pending;
      const next = { ...pending };
      delete next[index];
      return next;
    });
  }

  dismissAvatarEnrichment(index: number): void {
    this.clearAvatarEnrichment(index);
    this.avatarEnrichError.set(null);
  }

  confirmAvatarEnrichment(index: number): void {
    const pending = this.avatarEnrichmentFor(index);
    if (!pending) return;
    this.customerAvatars.update((list) => {
      const next = [...list];
      next[index] = pending.enriched;
      return next;
    });
    this.clearAvatarEnrichment(index);
    this.avatarEnrichError.set(null);
  }

  async enrichCustomerAvatar(index: number): Promise<void> {
    const draft = (this.customerAvatars()[index] ?? '').trim();
    if (draft.length < 5) return;

    const siteId = this.siteId();
    if (!siteId) {
      this.avatarEnrichError.set('No site loaded.');
      return;
    }

    this.avatarEnrichingSlot.set(index);
    this.avatarEnrichError.set(null);

    try {
      const res = await this.api.enrichCustomer(siteId, {
        draft,
        services: this.services(),
        tradeLabel: this.tradeLabel() ?? undefined,
      });

      if (res.error === 'llm_not_configured') {
        this.avatarEnrichError.set('Add detail needs AI configured on the server.');
        return;
      }
      if (res.error === 'no_change') {
        this.avatarEnrichError.set('Already specific enough — add a bit more detail first.');
        return;
      }
      if (res.error && res.enriched === draft) {
        this.avatarEnrichError.set('Could not add detail right now — try again.');
        return;
      }

      this.avatarEnrichmentPending.update((pending) => ({
        ...pending,
        [index]: { original: draft, enriched: res.enriched },
      }));
    } catch (err) {
      this.avatarEnrichError.set(parseProtopipeApiError(err, 'Could not add detail.'));
    } finally {
      this.avatarEnrichingSlot.set(null);
    }
  }

  addCustomerAvatarSlot(): void {
    this.customerAvatars.update((list) => {
      if (list.length >= MAX_CUSTOMER_AVATARS) return list;
      return [...list, ''];
    });
  }

  canAddCustomerAvatar(): boolean {
    return this.customerAvatars().length < MAX_CUSTOMER_AVATARS;
  }

  avatarPlaceholder(index: number): string {
    return (
      this.scanUiContext().avatarPlaceholders[index] ?? 'What does this person want?'
    );
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
    this.addTargetCustomer();
    this.addCompetitor();
    if (
      !this.form.valid ||
      this.services().length === 0 ||
      !this.isCompetitorsStepValid() ||
      !this.isMarketStepValid()
    ) {
      this.form.markAllAsTouched();
      this.step.set(this.firstInvalidStep());
      return;
    }

    this.isSubmitting.set(true);
    const v = this.form.getRawValue();
    const mode = this.onboardingMode() ?? 'existing_site';
    const websiteUrl =
      mode === 'strategy_only' ? '' : this.normalizeUrl(v.websiteUrl);
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
        onboardingMode: mode as ProtopipeOnboardingMode,
        services,
        customerAvatars: avatars,
        targetCustomerSites: this.targetCustomerSites(),
        competitors: this.competitors(),
        marketScope: scope!,
        serpLocationCode: defaultSerpLocationCode,
        serpLocationName: defaultSerpLocationName,
        city,
        state,
        countryIso: country?.iso,
      };

      const result = await this.api.completeOnboarding(siteId, {
        businessName: v.businessName.trim(),
        websiteUrl: websiteUrl || '',
        profile,
      });
      this.hostedSiteConnected.set(Boolean(result.hostedSiteConnected));

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
    await this.router.navigateByUrl('/home/dashboard');
  }

  openScheduleCall(): void {
    const url = this.scheduleCallUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private focusForStep(s: Step): void {
    if (s === 1 && this.onboardingMode() === 'existing_site') {
      this.urlInput()?.nativeElement?.focus();
    } else if (s === 2) this.serviceInput()?.nativeElement?.focus();
    else if (s === 3) this.avatarInput0()?.nativeElement?.focus();
    else if (s === 4) this.targetCustomerInput()?.nativeElement?.focus();
    else if (s === 5) this.competitorInput()?.nativeElement?.focus();
    else if (s === 7) this.nameInput()?.nativeElement?.focus();
  }

  private isStepValid(step: Step): boolean {
    const c = this.form.controls;
    switch (step) {
      case 1:
        if (!this.onboardingMode()) return false;
        if (this.onboardingMode() === 'strategy_only') return true;
        return c.websiteUrl.valid;
      case 2:
        return this.services().length > 0 || this.serviceDraft().trim().length > 0;
      case 3:
        return this.isAvatarsStepValid();
      case 4:
        return true;
      case 5:
        return this.isCompetitorsStepValid();
      case 6:
        return this.isMarketStepValid();
      case 7:
        return c.businessName.valid;
    }
  }

  private isCompetitorsStepValid(): boolean {
    if (!this.isStrategyOnly()) return true;
    return (
      this.competitors().length > 0 || this.competitorDraft().trim().length > 0
    );
  }

  private markStepTouched(step: Step): void {
    const c = this.form.controls;
    if (step === 1 && this.onboardingMode() === 'existing_site') {
      c.websiteUrl.markAsTouched();
    } else if (step === 7) c.businessName.markAsTouched();
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
    if (step === 1) {
      if (!this.onboardingMode()) return 'Choose how you are starting to continue.';
      if (this.onboardingMode() === 'existing_site') return 'Add your website to continue.';
      return 'One of the fields above is invalid.';
    }
    if (step === 2) {
      return this.isStrategyOnly()
        ? 'Add at least one service you want to test.'
        : 'Add at least one service you want to sell.';
    }
    if (step === 3) return 'Describe what at least one customer wants (5+ characters).';
    if (step === 5 && this.isStrategyOnly()) {
      return 'Add at least one competitor to continue.';
    }
    if (step === 6) {
      const scope = this.customerScope();
      if (!scope) return 'Choose local, national, or worldwide.';
      if (scope === 'local') return 'Pick your town or city to continue.';
      if (scope === 'national') return 'Pick a country to continue.';
      return 'One of the fields above is invalid.';
    }
    if (step === 7) {
      return this.isStrategyOnly()
        ? 'Add a project name to continue.'
        : 'Add your business name to continue.';
    }
    return 'One of the fields above is invalid.';
  }

  private firstInvalidStep(): Step {
    if (!this.onboardingMode()) return 1;
    if (this.onboardingMode() === 'existing_site' && !this.form.controls.websiteUrl.valid) {
      return 1;
    }
    if (this.services().length === 0) return 2;
    if (!this.isAvatarsStepValid()) return 3;
    if (!this.isCompetitorsStepValid()) return 5;
    if (!this.isMarketStepValid()) return 6;
    if (!this.form.controls.businessName.valid) return 7;
    return 7;
  }

  private normalizeUrl(raw: string): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private normalizeDomain(raw: string): string {
    return raw
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
  }

  private hasCurrentOfferScan(url: string): boolean {
    const scanned = this.offerScannedUrl().trim();
    if (!scanned) return false;
    return this.normalizeDomain(scanned) === this.normalizeDomain(url);
  }
}
