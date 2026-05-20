import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import type { KeywordIntent, KeywordPriority, ProtopipeKeyword } from '../protopipe.models';
import { INTENT_OPTIONS, PRIORITY_OPTIONS } from '../protopipe-keyword-display';
import {
  PROTOPIPE_MAX_NOTES_LENGTH,
  PROTOPIPE_MAX_PHRASE_LENGTH,
} from '../protopipe.constants';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

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
    Tooltip,
    ConfirmDialog,
    Toast,
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
  readonly error = this.strategy.error;
  readonly intentOptions = INTENT_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly newPhrase = signal('');
  readonly newIntent = signal<KeywordIntent>('commercial');
  readonly newPriority = signal<KeywordPriority>('medium');
  readonly newNotes = signal('');

  readonly maxPhraseLength = PROTOPIPE_MAX_PHRASE_LENGTH;
  readonly maxNotesLength = PROTOPIPE_MAX_NOTES_LENGTH;

  ngOnInit(): void {
    void this.strategy.ensureLoaded();
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

  onPhraseChange(kw: ProtopipeKeyword, phrase: string): void {
    this.strategy.updateKeyword(kw.id, { phrase });
  }

  onIntentChange(kw: ProtopipeKeyword, intent: KeywordIntent): void {
    this.strategy.updateKeyword(kw.id, { intent });
  }

  onPriorityChange(kw: ProtopipeKeyword, priority: KeywordPriority): void {
    this.strategy.updateKeyword(kw.id, { priority });
  }

  onNotesChange(kw: ProtopipeKeyword, notes: string): void {
    this.strategy.updateKeyword(kw.id, { notes });
  }

  confirmRemove(kw: ProtopipeKeyword, event: Event): void {
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: `Remove "${kw.phrase}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.strategy.removeKeyword(kw.id),
    });
  }
}
