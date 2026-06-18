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
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import type {
  BrandBookImageStylePresetId,
  BrandBookInfographVariant,
  PitchMediaAssetDto,
  PitchMediaKind,
  PitchMediaSlot,
} from '@hive/contracts';
import { ProtopipeBrandBookService } from '../brand-book/protopipe-brand-book.service';
import {
  BRAND_BOOK_IMAGE_PRESETS,
  BRAND_BOOK_INFOGRAPH_VARIANTS,
} from '../brand-book/brand-book.constants';
import { ProtopipeSiteBuilderService } from '../site-builder/protopipe-site-builder.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipePitchPrepService } from './protopipe-pitch-prep.service';
import { ProtopipePitchProspectService } from './protopipe-pitch-prospect.service';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const THEME_OPTIONS = [
  { label: 'Ocean', value: 'ocean' },
  { label: 'Classic gold', value: 'classic-gold' },
  { label: 'Slate rose', value: 'slate-rose' },
  { label: 'Ink cream', value: 'ink-cream' },
  { label: 'Construction bold', value: 'construction-bold' },
  { label: 'Tech agency dark', value: 'tech-agency-dark' },
];

const SLOT_LABELS: Record<PitchMediaSlot, string> = {
  hero: 'Hero photo',
  section: 'Section photo',
  stats: 'Stats infographic',
  process: 'Process infographic',
  background: 'Background',
};

@Component({
  selector: 'app-protopipe-pitch-prep-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    Button,
    InputText,
    Textarea,
    Message,
    ProgressSpinner,
    Select,
  ],
  templateUrl: './protopipe-pitch-prep-wizard.component.html',
  styleUrl: './protopipe-pitch-prep-wizard.component.scss',
})
export class ProtopipePitchPrepWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly prospectSvc = inject(ProtopipePitchProspectService);
  readonly pitchPrep = inject(ProtopipePitchPrepService);
  readonly brandBookSvc = inject(ProtopipeBrandBookService);
  readonly siteBuilder = inject(ProtopipeSiteBuilderService);

  readonly step = signal<WizardStep>(1);
  readonly totalSteps = 6;
  readonly imagePresets = BRAND_BOOK_IMAGE_PRESETS;
  readonly infographVariants = BRAND_BOOK_INFOGRAPH_VARIANTS;
  readonly themeOptions = THEME_OPTIONS;
  readonly slotLabels = SLOT_LABELS;

  readonly selectedTemplateId = signal('starter-minimal-v1');
  readonly selectedTheme = signal('classic-gold');
  readonly refineNotes = signal<Record<string, string>>({});
  readonly refiningSlot = signal<string | null>(null);
  readonly initError = signal<string | null>(null);

  readonly siteId = computed(() => this.prospectSvc.current()?.siteId ?? null);

  readonly assetsBySlot = computed(() => {
    const map = new Map<PitchMediaSlot, PitchMediaAssetDto[]>();
    for (const asset of this.pitchPrep.assets()) {
      const list = map.get(asset.slot) ?? [];
      list.push(asset);
      map.set(asset.slot, list);
    }
    return map;
  });

  readonly refineSlots: PitchMediaSlot[] = ['hero', 'section', 'stats', 'process', 'background'];

  slotLabel(slot: PitchMediaSlot): string {
    return this.slotLabels[slot];
  }

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    const prospectId = this.route.snapshot.paramMap.get('prospectId');
    if (!prospectId) {
      this.initError.set('Missing prospect');
      return;
    }

    const prospect = await this.prospectSvc.loadOne(prospectId);
    if (!prospect) {
      this.initError.set('Prospect not found');
      return;
    }

    await this.brandBookSvc.loadForSite(prospect.siteId);
    await this.pitchPrep.loadContext(prospect.siteId);
    await this.pitchPrep.loadMedia(prospect.siteId);
    await this.siteBuilder.ensureTemplatesLoaded();

    if (this.pitchPrep.context()) {
      this.step.set(2);
    }
    if (this.pitchPrep.assets().length) {
      this.step.set(4);
    }
    if (prospect.status === 'ready') {
      this.step.set(6);
    }
  }

  next(): void {
    const s = this.step();
    if (s < 6) this.step.set((s + 1) as WizardStep);
  }

  back(): void {
    const s = this.step();
    if (s > 1) this.step.set((s - 1) as WizardStep);
  }

  async runIngest(): Promise<void> {
    const siteId = this.siteId();
    const prospect = this.prospectSvc.current();
    if (!siteId || !prospect) return;

    const context = await this.pitchPrep.ingest(siteId, prospect.sourceUrl);
    if (context) this.next();
  }

  onPresetChange(presetId: BrandBookImageStylePresetId): void {
    this.brandBookSvc.patchImagePreset(presetId);
  }

  onInfographChange(variant: BrandBookInfographVariant): void {
    this.brandBookSvc.patchInfographVariant(variant);
  }

  async saveStyles(): Promise<void> {
    await this.brandBookSvc.save();
    this.next();
  }

  async runGeneratePack(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;
    await this.brandBookSvc.save();
    const assets = await this.pitchPrep.generatePack(siteId);
    if (assets.length) this.next();
  }

  noteKey(slot: PitchMediaSlot, kind: PitchMediaKind): string {
    return `${slot}:${kind}`;
  }

  setNote(slot: PitchMediaSlot, kind: PitchMediaKind, value: string): void {
    this.refineNotes.update((n) => ({ ...n, [this.noteKey(slot, kind)]: value }));
  }

  getNote(slot: PitchMediaSlot, kind: PitchMediaKind): string {
    return this.refineNotes()[this.noteKey(slot, kind)] ?? '';
  }

  async regenerate(slot: PitchMediaSlot, kind: PitchMediaKind): Promise<void> {
    const siteId = this.siteId();
    const notes = this.getNote(slot, kind).trim();
    if (!siteId || !notes) return;

    const key = this.noteKey(slot, kind);
    this.refiningSlot.set(key);
    try {
      await this.pitchPrep.regenerate(siteId, slot, kind, notes);
    } finally {
      this.refiningSlot.set(null);
    }
  }

  async selectAsset(asset: PitchMediaAssetDto): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;
    await this.pitchPrep.selectAsset(siteId, asset.id);
  }

  async saveSiteStyle(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;
    const ok = await this.pitchPrep.saveStyle(
      siteId,
      this.selectedTemplateId(),
      this.selectedTheme(),
    );
    if (ok) this.next();
  }

  async finish(): Promise<void> {
    const prospect = this.prospectSvc.current();
    if (!prospect) return;
    try {
      await this.prospectSvc.markReady(prospect.id);
      void this.router.navigate(['/protopipe/pitch-prep']);
    } catch (err) {
      this.initError.set(parseProtopipeApiError(err, 'Could not finish'));
    }
  }

  patchContextField(field: 'summary' | 'services' | 'businessName' | 'toneSignals', value: string): void {
    this.pitchPrep.patchContext({ [field]: value });
  }
}
