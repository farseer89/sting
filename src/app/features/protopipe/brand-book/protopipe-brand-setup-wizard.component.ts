import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';
import type { BrandBookImageStylePresetId, BrandBookInfographVariant } from '@hive/contracts';
import { ProtopipeBrandBookService } from '../brand-book/protopipe-brand-book.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import {
  BRAND_BOOK_IMAGE_PRESETS,
  BRAND_BOOK_INFOGRAPH_VARIANTS,
} from '../brand-book/brand-book.constants';
import { parseProtopipeApiError } from '../protopipe-http.util';

type WizardStep = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-protopipe-brand-setup-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Button, InputText, Textarea, Message],
  templateUrl: './protopipe-brand-setup-wizard.component.html',
  styleUrl: './protopipe-brand-setup-wizard.component.scss',
})
export class ProtopipeBrandSetupWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly brandBookSvc = inject(ProtopipeBrandBookService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly step = signal<WizardStep>(1);
  readonly totalSteps = 4;
  readonly submitError = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly imagePresets = BRAND_BOOK_IMAGE_PRESETS;
  readonly infographVariants = BRAND_BOOK_INFOGRAPH_VARIANTS;

  readonly inspirationUrls = signal<string[]>(['', '', '']);

  readonly siteLabel = computed(() => {
    const site = this.strategy.site();
    return site?.displayName?.trim() || site?.hostname || 'Your site';
  });

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    const querySiteId = this.route.snapshot.queryParamMap.get('siteId');
    if (querySiteId && querySiteId !== this.strategy.siteId()) {
      // Site was just created — bootstrap may need reload; strategy uses bootstrap site
    }
    await this.brandBookSvc.load();
  }

  next(): void {
    const s = this.step();
    if (s < 4) this.step.set((s + 1) as WizardStep);
  }

  back(): void {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as WizardStep);
  }

  skip(): void {
    void this.router.navigate(['/home']);
  }

  onPresetChange(presetId: BrandBookImageStylePresetId): void {
    this.brandBookSvc.patchImagePreset(presetId);
  }

  onInfographChange(variant: BrandBookInfographVariant): void {
    this.brandBookSvc.patchInfographVariant(variant);
  }

  setInspirationUrl(index: number, value: string): void {
    const urls = [...this.inspirationUrls()];
    urls[index] = value;
    this.inspirationUrls.set(urls);
  }

  async finish(): Promise<void> {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    try {
      await this.brandBookSvc.save();

      for (const url of this.inspirationUrls()) {
        const trimmed = url.trim();
        if (trimmed) {
          await this.brandBookSvc.ingestInspiration(trimmed);
        }
      }

      await this.brandBookSvc.markSetupComplete();
      await this.router.navigate(['/home'], {
        queryParams: { view: 'brand-book' },
      });
    } catch (err) {
      this.submitError.set(parseProtopipeApiError(err, 'Could not save brand book'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
