import { Injectable, inject, signal } from '@angular/core';
import type {
  ProtopipeAudienceBookDto,
  ProtopipeAudienceProfile,
  PutAudienceBookVoiceRequest,
} from '@hive/contracts';
import { firstValueFrom } from 'rxjs';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeAudienceBookService {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _savingVoice = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _book = signal<ProtopipeAudienceBookDto | null>(null);
  private readonly _voiceDraft = signal<ProtopipeAudienceBookDto['siteVoice'] | null>(null);
  private readonly _voiceDirty = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly savingVoice = this._savingVoice.asReadonly();
  readonly error = this._error.asReadonly();
  readonly book = this._book.asReadonly();
  readonly voiceDraft = this._voiceDraft.asReadonly();
  readonly voiceDirty = this._voiceDirty.asReadonly();

  private siteId(): string | null {
    return this.strategy.siteId();
  }

  async load(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const { audienceBook } = await this.api.getAudienceBook(siteId);
      this._book.set(audienceBook);
      this._voiceDraft.set(structuredClone(audienceBook.siteVoice));
      this._voiceDirty.set(false);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load audience book'));
      this._book.set(null);
      this._voiceDraft.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  patchVoiceField(field: 'tone' | 'pointOfView' | 'readingLevel', value: string): void {
    const draft = this._voiceDraft();
    if (!draft) return;
    this._voiceDraft.set({ ...draft, [field]: value });
    this._voiceDirty.set(true);
  }

  patchAvoidPhrases(value: string): void {
    const draft = this._voiceDraft();
    if (!draft) return;
    const avoidPhrases = value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    this._voiceDraft.set({ ...draft, avoidPhrases });
    this._voiceDirty.set(true);
  }

  patchStyleExample(index: number, value: string): void {
    const draft = this._voiceDraft();
    if (!draft) return;
    const styleExamples = [...(draft.styleExamples ?? [])];
    while (styleExamples.length <= index) styleExamples.push('');
    styleExamples[index] = value;
    this._voiceDraft.set({
      ...draft,
      styleExamples: styleExamples.filter((e, i) => e.trim() || i < 3),
    });
    this._voiceDirty.set(true);
  }

  async saveVoice(): Promise<boolean> {
    const siteId = this.siteId();
    const book = this._book();
    const draft = this._voiceDraft();
    if (!siteId || !book || !draft) return false;

    this._savingVoice.set(true);
    this._error.set(null);
    try {
      const body: PutAudienceBookVoiceRequest = {
        expectedVersion: book.voiceVersion,
        voice: {
          tone: draft.tone,
          pointOfView: draft.pointOfView,
          readingLevel: draft.readingLevel,
          avoidPhrases: draft.avoidPhrases,
        },
        styleExamples: (draft.styleExamples ?? []).map((e) => e.trim()).filter(Boolean).slice(0, 5),
      };
      const { audienceBook } = await this.api.putAudienceBookVoice(siteId, body);
      this._book.set(audienceBook);
      this._voiceDraft.set(structuredClone(audienceBook.siteVoice));
      this._voiceDirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save site voice'));
      return false;
    } finally {
      this._savingVoice.set(false);
    }
  }

  async upsertAudience(
    profile: Omit<ProtopipeAudienceProfile, 'lastEditedAt' | 'lastEditedBy'>,
  ): Promise<boolean> {
    const siteId = this.siteId();
    const book = this._book();
    if (!siteId || !book) return false;

    this._error.set(null);
    try {
      await firstValueFrom(
        this.api.upsertAudience$(siteId, profile.id, {
          profile,
          expectedSummaryVersion: book.summaryVersion,
        }),
      );
      await this.load();
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save audience'));
      return false;
    }
  }

  async deleteAudience(audienceId: string): Promise<boolean> {
    const siteId = this.siteId();
    const book = this._book();
    if (!siteId || !book) return false;

    this._error.set(null);
    try {
      await firstValueFrom(
        this.api.deleteAudience$(siteId, audienceId, {
          expectedSummaryVersion: book.summaryVersion,
        }),
      );
      await this.load();
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not delete audience'));
      return false;
    }
  }
}
