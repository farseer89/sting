import { Injectable, inject, signal } from '@angular/core';
import type {
  BrandBookImageStylePresetId,
  BrandBookInfographVariant,
  ProtopipeBrandBookDto,
  PutProtopipeBrandBookRequest,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeBrandBookService {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _brandBook = signal<ProtopipeBrandBookDto | null>(null);
  private readonly _draft = signal<ProtopipeBrandBookDto | null>(null);
  private readonly _dirty = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly brandBook = this._brandBook.asReadonly();
  readonly draft = this._draft.asReadonly();
  readonly dirty = this._dirty.asReadonly();

  readonly setupComplete = () => Boolean(this._brandBook()?.setupCompletedAt);

  private siteId(): string | null {
    return this._siteIdOverride() ?? this.strategy.siteId();
  }

  private readonly _siteIdOverride = signal<string | null>(null);

  setSiteIdOverride(siteId: string | null): void {
    this._siteIdOverride.set(siteId);
  }

  async loadForSite(siteId: string): Promise<void> {
    this.setSiteIdOverride(siteId);
    await this.load();
  }

  async load(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const { brandBook } = await this.api.getBrandBook(siteId);
      this._brandBook.set(brandBook);
      this._draft.set(structuredClone(brandBook));
      this._dirty.set(false);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load brand book'));
      this._brandBook.set(null);
      this._draft.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  patchDraft(patch: PutProtopipeBrandBookRequest): void {
    const current = this._draft();
    if (!current) return;

    const next: ProtopipeBrandBookDto = {
      ...current,
      imageStyle: patch.imageStyle
        ? { ...current.imageStyle, ...patch.imageStyle }
        : current.imageStyle,
      infographStyle: patch.infographStyle
        ? {
            ...current.infographStyle,
            ...patch.infographStyle,
            palette: patch.infographStyle.palette
              ? { ...current.infographStyle.palette, ...patch.infographStyle.palette }
              : current.infographStyle.palette,
          }
        : current.infographStyle,
      voice: patch.voice ? { ...current.voice, ...patch.voice } : current.voice,
      styleExamples: patch.styleExamples ?? current.styleExamples,
      inspirationArticles: patch.inspirationArticles ?? current.inspirationArticles,
      setupCompletedAt:
        patch.setupCompletedAt === null
          ? undefined
          : patch.setupCompletedAt ?? current.setupCompletedAt,
    };

    this._draft.set(next);
    this._dirty.set(true);
  }

  patchImagePreset(presetId: BrandBookImageStylePresetId): void {
    this.patchDraft({ imageStyle: { presetId } });
  }

  patchInfographVariant(variant: BrandBookInfographVariant): void {
    this.patchDraft({ infographStyle: { variant } });
  }

  patchVoiceField(field: 'tone' | 'pointOfView' | 'readingLevel', value: string): void {
    const draft = this._draft();
    if (!draft) return;
    this.patchDraft({ voice: { ...draft.voice, [field]: value } });
  }

  patchAvoidPhrases(value: string): void {
    const phrases = value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    this.patchDraft({ voice: { ...this._draft()?.voice, avoidPhrases: phrases } });
  }

  patchStyleExample(index: number, value: string): void {
    const draft = this._draft();
    if (!draft) return;
    const examples = [...draft.styleExamples];
    while (examples.length <= index) examples.push('');
    examples[index] = value;
    this.patchDraft({ styleExamples: examples.slice(0, 5) });
  }

  async save(): Promise<boolean> {
    const siteId = this.siteId();
    const draft = this._draft();
    const saved = this._brandBook();
    if (!siteId || !draft) return false;

    this._saving.set(true);
    this._error.set(null);
    try {
      const { brandBook } = await this.api.putBrandBook(siteId, {
        expectedVersion: saved?.version,
        imageStyle: draft.imageStyle,
        infographStyle: draft.infographStyle,
        voice: draft.voice,
        styleExamples: draft.styleExamples,
        inspirationArticles: draft.inspirationArticles,
        setupCompletedAt: draft.setupCompletedAt ?? null,
      });
      this._brandBook.set(brandBook);
      this._draft.set(structuredClone(brandBook));
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save brand book'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  async ingestInspiration(url: string, notes?: string): Promise<boolean> {
    const siteId = this.siteId();
    if (!siteId || !url.trim()) return false;

    this._saving.set(true);
    this._error.set(null);
    try {
      const { brandBook } = await this.api.ingestBrandBookInspiration(siteId, {
        url: url.trim(),
        notes: notes?.trim(),
      });
      this._brandBook.set(brandBook);
      this._draft.set(structuredClone(brandBook));
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not add inspiration article'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  async markSetupComplete(): Promise<boolean> {
    this.patchDraft({ setupCompletedAt: new Date().toISOString() });
    return this.save();
  }
}
