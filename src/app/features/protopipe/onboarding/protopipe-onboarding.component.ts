import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
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

interface BusinessForm {
  businessName: string;
  businessDescription: string;
  trade: string;
}

interface MarketForm {
  city: string;
  state: string;
  websiteUrl: string;
}

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

  readonly step = signal<1 | 2 | 3>(1);
  readonly isSubmitting = signal(false);
  readonly siteId = signal<string | null>(null);
  readonly locationSuggestions = signal<ProtopipeSerpLocationOption[]>([]);
  readonly selectedLocation = signal<ProtopipeSerpLocationOption | null>(null);
  readonly isSearchingLocations = signal(false);

  readonly businessForm = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    businessDescription: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(800)],
    ],
    trade: ['', [Validators.maxLength(80)]],
  });

  readonly marketForm = this.fb.nonNullable.group({
    city: ['', [Validators.maxLength(80)]],
    state: ['', [Validators.maxLength(80)]],
    websiteUrl: ['', [Validators.maxLength(300)]],
  });

  readonly goalForm = this.fb.nonNullable.group({
    seedPhrase: ['', [Validators.maxLength(200)]],
  });

  async ngOnInit(): Promise<void> {
    try {
      const boot = await this.state.load();
      const id = boot.primarySiteId || boot.sites[0]?.id || null;
      this.siteId.set(id);

      const site = boot.sites.find((s) => s.id === id);
      if (site && site.hostname && !site.hostname.endsWith('pending.local')) {
        this.marketForm.patchValue({ websiteUrl: site.url });
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
    if (this.step() === 1) {
      this.businessForm.markAllAsTouched();
      if (!this.businessForm.valid) {
        this.messages.add({
          severity: 'warn',
          summary: 'Almost there',
          detail: 'Add your business name and a short description (10+ characters) to continue.',
        });
        return;
      }
      this.step.set(2);
      return;
    }
    if (this.step() === 2) {
      this.marketForm.markAllAsTouched();
      if (!this.marketForm.valid) {
        this.messages.add({
          severity: 'warn',
          summary: 'Check your inputs',
          detail: 'One of the fields above is invalid.',
        });
        return;
      }
      this.step.set(3);
      return;
    }
  }

  previousStep(): void {
    if (this.step() === 2) this.step.set(1);
    else if (this.step() === 3) this.step.set(2);
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
      this.marketForm.patchValue({ city: parts[0] });
    }
    if (parts.length >= 2) {
      this.marketForm.patchValue({ state: parts[1] });
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

    this.isSubmitting.set(true);

    const business = this.businessForm.getRawValue() as BusinessForm;
    const market = this.marketForm.getRawValue() as MarketForm;
    const goal = this.goalForm.getRawValue();
    const location = this.selectedLocation();

    try {
      await this.api.completeOnboarding(siteId, {
        businessName: business.businessName.trim(),
        businessDescription: business.businessDescription.trim(),
        trade: business.trade.trim() || undefined,
        city: market.city.trim() || undefined,
        state: market.state.trim() || undefined,
        defaultSerpLocationCode: location?.code,
        defaultSerpLocationName: location?.name,
        websiteUrl: market.websiteUrl.trim() || undefined,
        seedPhrase: goal.seedPhrase.trim() || undefined,
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
}
