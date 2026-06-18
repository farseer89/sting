import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Textarea } from 'primeng/textarea';
import type { BrandBookImageStylePresetId, BrandBookInfographVariant } from '@hive/contracts';
import { ProtopipeBrandBookService } from '../../brand-book/protopipe-brand-book.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  BRAND_BOOK_IMAGE_PRESETS,
  BRAND_BOOK_INFOGRAPH_VARIANTS,
} from '../../brand-book/brand-book.constants';

@Component({
  selector: 'app-protopipe-home-brand-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Button, InputText, Textarea, Message, ProgressSpinner, DatePipe],
  templateUrl: './protopipe-home-brand-book.component.html',
  styleUrl: './protopipe-home-brand-book.component.scss',
})
export class ProtopipeHomeBrandBookComponent implements OnInit {
  readonly brandBookSvc = inject(ProtopipeBrandBookService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly runWizard = output<void>();

  readonly imagePresets = BRAND_BOOK_IMAGE_PRESETS;
  readonly infographVariants = BRAND_BOOK_INFOGRAPH_VARIANTS;

  readonly inspirationUrl = signal('');
  readonly inspirationNotes = signal('');

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.brandBookSvc.load();
  }

  onPresetChange(presetId: BrandBookImageStylePresetId): void {
    this.brandBookSvc.patchImagePreset(presetId);
  }

  onCustomSuffixChange(value: string): void {
    this.brandBookSvc.patchDraft({
      imageStyle: { presetId: 'custom', promptSuffix: value },
    });
  }

  onInfographChange(variant: BrandBookInfographVariant): void {
    this.brandBookSvc.patchInfographVariant(variant);
  }

  onPaletteChange(field: 'primary' | 'accent' | 'background', value: string): void {
    const draft = this.brandBookSvc.draft();
    if (!draft) return;
    this.brandBookSvc.patchDraft({
      infographStyle: {
        variant: draft.infographStyle.variant,
        palette: {
          primary: draft.infographStyle.palette?.primary ?? '#0a2240',
          accent: draft.infographStyle.palette?.accent ?? '#006e99',
          background: draft.infographStyle.palette?.background ?? '#f5f5f0',
          [field]: value,
        },
      },
    });
  }

  async save(): Promise<void> {
    await this.brandBookSvc.save();
  }

  async addInspiration(): Promise<void> {
    const ok = await this.brandBookSvc.ingestInspiration(
      this.inspirationUrl(),
      this.inspirationNotes(),
    );
    if (ok) {
      this.inspirationUrl.set('');
      this.inspirationNotes.set('');
    }
  }
}
