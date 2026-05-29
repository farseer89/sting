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
import { Textarea } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import type { ProtopipeSerpLocationOption } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeOnboardingStateService } from './protopipe-onboarding-state.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { PRODUCT_CONFIG } from '../../../core/config/product-config';

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5 as const;

@Component({
  selector: 'app-protopipe-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AutoComplete, Button, InputText, Textarea, Toast],
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
  readonly step = signal<Step>(1);
  readonly isSubmitting = signal(false);
  readonly siteId = signal<string | null>(null);
  readonly locationSuggestions = signal<ProtopipeSerpLocationOption[]>([]);
  readonly selectedLocation = signal<ProtopipeSerpLocationOption | null>(null);
  readonly isSearchingLocations = signal(false);

  readonly form = this.fb.nonNullable.group({
    businessName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
    businessDescription: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(800)],
    ],
    trade: ['', [Validators.maxLength(80)]],
    city: ['', [Validators.maxLength(80)]],
    state: ['', [Validators.maxLength(80)]],
    seedPhrase: ['', [Validators.maxLength(200)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly seedSuggestions = computed<readonly string[]>(() => {
    const v = this.formValue();
    const trade = (v.trade ?? '').trim().toLowerCase();
    const city = (v.city ?? '').trim().toLowerCase();
    if (!trade) return [];
    if (city) {
      return [`${trade} ${city}`, `best ${trade} in ${city}`, `${trade} near ${city}`];
    }
    return [`${trade} near me`, `local ${trade}`, `${trade} services`];
  });

  readonly progressPercent = computed(() =>
    Math.round((this.step() / this.totalSteps) * 100),
  );

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly descriptionInput =
    viewChild<ElementRef<HTMLTextAreaElement>>('descriptionInput');
  private readonly tradeInput = viewChild<ElementRef<HTMLInputElement>>('tradeInput');
  private readonly seedInput = viewChild<ElementRef<HTMLInputElement>>('seedInput');

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

  applySuggestion(phrase: string): void {
    this.form.controls.seedPhrase.setValue(phrase);
    this.form.controls.seedPhrase.markAsDirty();
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
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.step.set(this.firstInvalidStep());
      return;
    }

    this.isSubmitting.set(true);
    const v = this.form.getRawValue();
    const location = this.selectedLocation();

    try {
      await this.api.completeOnboarding(siteId, {
        businessName: v.businessName.trim(),
        businessDescription: v.businessDescription.trim(),
        trade: v.trade.trim() || undefined,
        city: v.city.trim() || undefined,
        state: v.state.trim() || undefined,
        defaultSerpLocationCode: location?.code,
        defaultSerpLocationName: location?.name,
        seedPhrase: v.seedPhrase.trim() || undefined,
      });

      this.state.invalidate();
      await this.router.navigateByUrl('/protopipe/keywords/discover/diy');
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not save',
        detail: parseProtopipeApiError(err, 'Please try again.'),
      });
      this.isSubmitting.set(false);
    }
  }

  private focusForStep(s: Step): void {
    if (s === 1) this.nameInput()?.nativeElement?.focus();
    else if (s === 2) this.descriptionInput()?.nativeElement?.focus();
    else if (s === 3) this.tradeInput()?.nativeElement?.focus();
    else if (s === 5) this.seedInput()?.nativeElement?.focus();
  }

  private isStepValid(step: Step): boolean {
    const c = this.form.controls;
    switch (step) {
      case 1:
        return c.businessName.valid;
      case 2:
        return c.businessDescription.valid;
      case 3:
        return c.trade.valid;
      case 4:
        return c.city.valid && c.state.valid;
      case 5:
        return c.seedPhrase.valid;
    }
  }

  private markStepTouched(step: Step): void {
    const c = this.form.controls;
    if (step === 1) c.businessName.markAsTouched();
    else if (step === 2) c.businessDescription.markAsTouched();
    else if (step === 3) c.trade.markAsTouched();
  }

  private stepHint(step: Step): string {
    if (step === 1) return 'Add your business name to continue.';
    if (step === 2) return 'Add a short description (10+ characters) to continue.';
    return 'One of the fields above is invalid.';
  }

  private firstInvalidStep(): Step {
    const c = this.form.controls;
    if (!c.businessName.valid) return 1;
    if (!c.businessDescription.valid) return 2;
    return 5;
  }
}
