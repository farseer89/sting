import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { KeywordIntent, KeywordPriority, ProtopipeKeywordDto } from '../protopipe.models';
import { INTENT_OPTIONS, PRIORITY_OPTIONS } from '../protopipe-keyword-display';
import type { ProtopipeKeywordMetricPoint } from '../protopipe.models';
import {
  formatMarketNumber,
  formatRankDelta,
  localHistoryRank,
  localRankForMarket,
  rankDeltaSeverity,
} from '../protopipe-market-display';
import {
  PROTOPIPE_MAX_NOTES_LENGTH,
  PROTOPIPE_MAX_PHRASE_LENGTH,
} from '../protopipe.constants';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { ProtopipeSerpDrawerComponent } from '../serp/protopipe-serp-drawer.component';

@Component({
  selector: 'app-protopipe-keywords',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Button,
    InputText,
    Select,
    TableModule,
    Tag,
    Tooltip,
    ConfirmDialog,
    Toast,
    Dialog,
    ProgressSpinner,
    ProtopipeSerpDrawerComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './protopipe-keywords.component.html',
  styleUrl: './protopipe-keywords.component.scss',
})
export class ProtopipeKeywordsComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly keywords = this.strategy.keywords;
  readonly dirty = this.strategy.dirty;
  readonly saving = this.strategy.saving;
  readonly loading = this.strategy.loading;
  readonly marketRefreshing = this.strategy.marketRefreshing;
  readonly lastEnrichSummary = this.strategy.lastEnrichSummary;
  readonly error = this.strategy.error;
  readonly activeSiteId = this.strategy.siteId;
  readonly activeSite = this.strategy.site;
  readonly intentOptions = INTENT_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly newPhrase = signal('');
  readonly newIntent = signal<KeywordIntent>('commercial');
  readonly newPriority = signal<KeywordPriority>('medium');
  readonly newNotes = signal('');

  readonly historyVisible = signal(false);
  readonly historyLoading = signal(false);
  readonly historyPhrase = signal('');
  readonly historyPoints = signal<ProtopipeKeywordMetricPoint[]>([]);

  readonly localHistoryVisible = signal(false);
  readonly localHistoryLoading = signal(false);
  readonly localHistoryPhrase = signal('');
  readonly localHistoryPoints = signal<ProtopipeKeywordMetricPoint[]>([]);

  readonly serpDrawerVisible = signal(false);
  readonly serpDrawerKeyword = signal<ProtopipeKeywordDto | null>(null);

  readonly maxPhraseLength = PROTOPIPE_MAX_PHRASE_LENGTH;
  readonly maxNotesLength = PROTOPIPE_MAX_NOTES_LENGTH;
  readonly formatMarketNumber = formatMarketNumber;
  readonly formatRankDelta = formatRankDelta;
  readonly rankDeltaSeverity = rankDeltaSeverity;
  readonly localRankForMarket = localRankForMarket;
  readonly localHistoryRank = localHistoryRank;

  ngOnInit(): void {
    void this.strategy.ensureLoaded();
  }

  async refreshMarketData(): Promise<void> {
    const ok = await this.strategy.refreshMarketData();
    if (ok) {
      this.messages.add({
        severity: 'success',
        summary: 'Market data updated',
        detail: this.lastEnrichSummary() ?? 'Keywords enriched from DataForSEO.',
        life: 5000,
      });
    } else if (this.error()) {
      this.messages.add({
        severity: 'error',
        summary: 'Refresh failed',
        detail: this.error() ?? 'Unknown error',
        life: 5000,
      });
    }
  }

  async openHistory(kw: ProtopipeKeywordDto): Promise<void> {
    this.historyPhrase.set(kw.phrase);
    this.historyVisible.set(true);
    this.historyLoading.set(true);
    this.historyPoints.set([]);
    try {
      const points = await this.strategy.loadKeywordHistory(kw.id);
      this.historyPoints.set(points);
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'History unavailable',
        detail: 'Could not load metric history for this keyword.',
        life: 4000,
      });
    } finally {
      this.historyLoading.set(false);
    }
  }

  closeHistory(): void {
    this.historyVisible.set(false);
  }

  async openLocalHistory(kw: ProtopipeKeywordDto): Promise<void> {
    this.localHistoryPhrase.set(kw.phrase);
    this.localHistoryVisible.set(true);
    this.localHistoryLoading.set(true);
    this.localHistoryPoints.set([]);
    try {
      const points = await this.strategy.loadKeywordHistory(kw.id);
      this.localHistoryPoints.set(points);
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'Local history unavailable',
        detail: 'Could not load metric history for this keyword.',
        life: 4000,
      });
    } finally {
      this.localHistoryLoading.set(false);
    }
  }

  closeLocalHistory(): void {
    this.localHistoryVisible.set(false);
  }

  openSerp(kw: ProtopipeKeywordDto): void {
    if (kw.id.startsWith('temp-')) return;
    this.serpDrawerKeyword.set(kw);
    this.serpDrawerVisible.set(true);
  }

  formatHistoryDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  async saveKeywords(): Promise<void> {
    const ok = await this.strategy.saveKeywords();
    if (ok) {
      this.messages.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Keywords synced to your plan.',
        life: 3000,
      });
    } else if (this.error()) {
      this.messages.add({
        severity: 'error',
        summary: 'Save failed',
        detail: this.error() ?? 'Unknown error',
        life: 5000,
      });
    }
  }

  addKeyword(): void {
    const phrase = this.newPhrase().trim();
    if (!phrase) {
      return;
    }
    this.strategy.addKeyword({
      phrase,
      intent: this.newIntent(),
      priority: this.newPriority(),
      notes: this.newNotes(),
    });
    this.newPhrase.set('');
    this.newNotes.set('');
  }

  onPhraseChange(kw: ProtopipeKeywordDto, phrase: string): void {
    this.strategy.updateKeyword(kw.id, { phrase });
  }

  onIntentChange(kw: ProtopipeKeywordDto, intent: KeywordIntent): void {
    this.strategy.updateKeyword(kw.id, { intent });
  }

  onPriorityChange(kw: ProtopipeKeywordDto, priority: KeywordPriority): void {
    this.strategy.updateKeyword(kw.id, { priority });
  }

  onNotesChange(kw: ProtopipeKeywordDto, notes: string): void {
    this.strategy.updateKeyword(kw.id, { notes });
  }

  confirmRemove(kw: ProtopipeKeywordDto, event: Event): void {
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: `Remove "${kw.phrase}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.strategy.removeKeyword(kw.id),
    });
  }
}
