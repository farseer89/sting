import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  ArticleGenerationStep,
  ArticleGenerationType,
} from '@hive/contracts';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ArticlePipelineOutlineComponent } from './article-pipeline-outline.component';
import { ArticlePipelineRunStore } from './article-pipeline-run.store';

@Component({
  selector: 'app-article-pipeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    ArticlePipelineOutlineComponent,
  ],
  providers: [MessageService],
  templateUrl: './article-pipeline.component.html',
  styleUrl: './article-pipeline.component.scss',
})
export class ArticlePipelineComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly store = inject(ArticlePipelineRunStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);

  readonly keywords = this.strategy.keywords;
  readonly run = this.store.run;
  readonly starting = this.store.starting;
  readonly saving = this.store.saving;
  readonly storeError = this.store.error;
  readonly status = this.store.status;
  readonly isComplete = this.store.isComplete;
  readonly hasFailed = this.store.hasFailed;

  readonly selectedKeywordId = signal<string | null>(null);
  readonly activeStep = signal<ArticleGenerationStep>('infer_type');

  readonly keywordOptions = computed(() =>
    this.keywords()
      .filter((k) => !k.id.startsWith('temp-'))
      .map((k) => ({ value: k.id, label: k.phrase, intent: k.intent })),
  );

  readonly canRun = computed(
    () => !!this.selectedKeywordId() && !this.starting() && !this.store.isRunning(),
  );

  readonly canSavePost = computed(
    () =>
      this.isComplete() &&
      !!this.run()?.artifacts?.template &&
      !this.run()?.contentPostId,
  );

  readonly statusLabel = computed(() => {
    const status = this.status();
    if (status === 'idle') return 'Pick a keyword to begin';
    if (status === 'pending') return 'Queued';
    if (status === 'running') return `Running · ${this.run()?.currentStep ?? '...'}`;
    if (status === 'complete') return 'Complete';
    if (status === 'failed') return 'Failed';
    return status;
  });

  async ngOnInit(): Promise<void> {
    this.destroyRef.onDestroy(() => this.store.stopPolling());

    await this.strategy.ensureLoaded();
    const siteId = this.strategy.siteId();
    if (siteId) {
      this.store.setSiteId(siteId);
    }
    if (!this.selectedKeywordId() && this.keywordOptions().length > 0) {
      this.selectedKeywordId.set(this.keywordOptions()[0].value);
    }
  }

  selectStep(step: ArticleGenerationStep): void {
    this.activeStep.set(step);
  }

  async run_pipeline(): Promise<void> {
    const keywordId = this.selectedKeywordId();
    if (!keywordId) return;
    await this.store.startRun({ keywordId });
    this.activeStep.set('infer_type');
    if (this.storeError()) {
      this.toast.add({
        severity: 'error',
        summary: 'Could not start',
        detail: this.storeError() ?? '',
        life: 4000,
      });
    }
  }

  async saveAsPost(): Promise<void> {
    const result = await this.store.saveAsPost();
    if (result) {
      this.toast.add({
        severity: 'success',
        summary: 'Saved to calendar',
        detail: 'Article saved as a scheduled post',
        life: 3500,
      });
    } else if (this.storeError()) {
      this.toast.add({
        severity: 'error',
        summary: 'Save failed',
        detail: this.storeError() ?? '',
        life: 4000,
      });
    }
  }

  get articleType(): ArticleGenerationType | null {
    return this.run()?.articleType ?? null;
  }
}
