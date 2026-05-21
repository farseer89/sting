import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Message } from 'primeng/message';
import { ProtopipeAgentService } from '../protopipe-agent.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import {
  PROTOPIPE_MAX_CONTENT_HELPER_EXAMPLE_LENGTH,
  PROTOPIPE_MAX_CONTENT_HELPER_EXAMPLES,
} from '../protopipe.constants';

@Component({
  selector: 'app-protopipe-content-helper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Button, InputText, Textarea, ProgressSpinner, Message],
  templateUrl: './protopipe-content-helper.component.html',
  styleUrl: './protopipe-content-helper.component.scss',
})
export class ProtopipeContentHelperComponent implements OnInit {
  protected readonly agent = inject(ProtopipeAgentService);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly maxExamples = PROTOPIPE_MAX_CONTENT_HELPER_EXAMPLES;
  readonly maxExampleLen = PROTOPIPE_MAX_CONTENT_HELPER_EXAMPLE_LENGTH;

  ingestUrl = '';
  ingestText = '';

  readonly loading = this.strategy.loading;
  readonly helper = this.agent.helper;
  readonly helperLoading = this.agent.helperLoading;
  readonly helperSaving = this.agent.helperSaving;
  readonly helperDirty = this.agent.helperDirty;
  readonly helperError = this.agent.helperError;
  readonly ingestLoading = this.agent.ingestLoading;

  async ngOnInit(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.agent.loadContentHelper();
  }

  onToneChange(value: string): void {
    this.agent.patchHelperDraft({ voice: { tone: value } });
  }

  onPovChange(value: string): void {
    this.agent.patchHelperDraft({ voice: { pointOfView: value } });
  }

  onExampleChange(index: number, value: string): void {
    const h = this.helper();
    if (!h) return;
    const examples = [...(h.examples ?? [])];
    while (examples.length <= index) examples.push('');
    examples[index] = value;
    this.agent.patchHelperDraft({ examples: examples.slice(0, this.maxExamples) });
  }

  async save(): Promise<void> {
    await this.agent.saveContentHelper();
  }

  async ingestUrlSubmit(): Promise<void> {
    const url = this.ingestUrl.trim();
    if (!url) return;
    await this.agent.ingestReference({ url });
    this.ingestUrl = '';
  }

  async ingestTextSubmit(): Promise<void> {
    const text = this.ingestText.trim();
    if (!text) return;
    await this.agent.ingestReference({ text });
    this.ingestText = '';
  }
}
