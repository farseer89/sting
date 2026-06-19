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

type BinderSection = 'images' | 'infographics' | 'copy-style' | 'typography' | 'logo' | 'inspiration' | 'corrections';

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

  readonly binderSection = signal<BinderSection>('images');

  readonly selectedChalkVariant = signal<string>('chalk-amber');

  readonly chalkVariants: {
    id: string;
    label: string;
    desc: string;
    texture: string;
    accentColor: string;
    accentFill: string;
  }[] = [
    {
      id: 'chalk-amber',
      label: 'Slate + Amber',
      desc: 'Dark slate, warm amber. Trades standard.',
      texture: '/assets/brand-book/chalk-amber.jpg',
      accentColor: '#f59e0b',
      accentFill: 'rgba(245,158,11,0.14)',
    },
    {
      id: 'chalk-blue',
      label: 'Navy + Blue',
      desc: 'Deep navy, electric blue. Clean authority.',
      texture: '/assets/brand-book/chalk-blue.jpg',
      accentColor: '#60a5fa',
      accentFill: 'rgba(96,165,250,0.12)',
    },
    {
      id: 'chalk-cream',
      label: 'Charcoal + Cream',
      desc: 'Neutral warmth. Versatile, timeless.',
      texture: '/assets/brand-book/chalk-cream.jpg',
      accentColor: 'rgba(254,249,239,0.5)',
      accentFill: 'rgba(254,249,239,0.07)',
    },
    {
      id: 'chalk-forest',
      label: 'Forest + Gold',
      desc: 'Dark green, gold accent. Earthy, confident.',
      texture: '/assets/brand-book/chalk-forest.jpg',
      accentColor: '#eab308',
      accentFill: 'rgba(234,179,8,0.12)',
    },
  ];

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

  selectChalkVariant(id: string): void {
    this.selectedChalkVariant.set(id);
    this.onInfographChange('chalkboard-svg');
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
