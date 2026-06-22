import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Textarea } from 'primeng/textarea';
import type {
  AudienceBookCompletenessTier,
  ProtopipeAudienceProfile,
} from '@hive/contracts';
import { ProtopipeAudienceBookService } from '../../audience-book/protopipe-audience-book.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

type BinderSection = 'overview' | 'voice' | 'audiences' | 'edit-audience';

type AudienceDraft = ProtopipeAudienceProfile;

const TIER_LABEL: Record<AudienceBookCompletenessTier, string> = {
  basic: 'Basic',
  good: 'Good',
  great: 'Great',
};

const TIER_HINT: Record<AudienceBookCompletenessTier, string> = {
  basic: 'Articles may feel generic until you add more detail.',
  good: 'Tone and reader intent are starting to shape output.',
  great: 'Generation has a strong reader and voice model.',
};

function emptyDraft(id: string): AudienceDraft {
  return {
    id,
    label: '',
    description: '',
    intentCluster: 'Custom audience',
    exampleQueries: [],
    origin: 'user',
  };
}

@Component({
  selector: 'app-protopipe-home-audience-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, InputText, Textarea, Message, ProgressSpinner],
  templateUrl: './protopipe-home-audience-book.component.html',
  styleUrl: './protopipe-home-audience-book.component.scss',
})
export class ProtopipeHomeAudienceBookComponent implements OnInit {
  readonly audienceBookSvc = inject(ProtopipeAudienceBookService);
  readonly strategy = inject(ProtopipeStrategyService);

  readonly binderSection = signal<BinderSection>('overview');
  readonly editingAudienceId = signal<string | null>(null);
  readonly audienceDraft = signal<AudienceDraft | null>(null);
  readonly savingAudience = signal(false);

  readonly overallTier = computed(() => this.audienceBookSvc.book()?.completeness.overall.tier ?? 'basic');
  readonly overallPct = computed(() => {
    const o = this.audienceBookSvc.book()?.completeness.overall;
    if (!o?.total) return 0;
    return Math.round((o.filled / o.total) * 100);
  });

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.audienceBookSvc.load();
  }

  tierLabel(tier: AudienceBookCompletenessTier): string {
    return TIER_LABEL[tier];
  }

  tierHint(tier: AudienceBookCompletenessTier): string {
    return TIER_HINT[tier];
  }

  audienceCompleteness(a: ProtopipeAudienceProfile) {
    return this.audienceBookSvc.book()?.completeness.perAudience[a.id];
  }

  selectSection(section: BinderSection): void {
    this.binderSection.set(section);
    if (section !== 'edit-audience') {
      this.editingAudienceId.set(null);
      this.audienceDraft.set(null);
    }
  }

  startAddAudience(): void {
    const id = `user-${Date.now()}`;
    this.editingAudienceId.set(id);
    this.audienceDraft.set(emptyDraft(id));
    this.binderSection.set('edit-audience');
  }

  startEditAudience(a: ProtopipeAudienceProfile): void {
    this.editingAudienceId.set(a.id);
    this.audienceDraft.set({ ...a, exampleQueries: [...(a.exampleQueries ?? [])] });
    this.binderSection.set('edit-audience');
  }

  cancelAudienceEdit(): void {
    this.editingAudienceId.set(null);
    this.audienceDraft.set(null);
    this.binderSection.set('audiences');
  }

  updateDraftField(field: keyof AudienceDraft, value: string): void {
    const current = this.audienceDraft();
    if (!current) return;
    this.audienceDraft.set({ ...current, [field]: value });
  }

  updateDraftQueries(value: string): void {
    const current = this.audienceDraft();
    if (!current) return;
    const exampleQueries = value
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 10);
    this.audienceDraft.set({ ...current, exampleQueries });
  }

  queriesText(): string {
    return (this.audienceDraft()?.exampleQueries ?? []).join('\n');
  }

  isEditingExistingAudience(): boolean {
    const id = this.editingAudienceId();
    if (!id) return false;
    return (this.audienceBookSvc.book()?.audiences ?? []).some((a) => a.id === id);
  }

  async saveVoice(): Promise<void> {
    await this.audienceBookSvc.saveVoice();
  }

  async saveAudience(): Promise<void> {
    const draft = this.audienceDraft();
    if (!draft?.description?.trim()) return;
    this.savingAudience.set(true);
    const ok = await this.audienceBookSvc.upsertAudience(draft);
    this.savingAudience.set(false);
    if (ok) this.cancelAudienceEdit();
  }

  async deleteAudience(a: ProtopipeAudienceProfile): Promise<void> {
    if (!confirm(`Delete audience "${a.label || a.intentCluster}"?`)) return;
    await this.audienceBookSvc.deleteAudience(a.id);
  }
}
