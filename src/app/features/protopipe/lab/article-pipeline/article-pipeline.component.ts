import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
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
import { ArticlePipelineBehindComponent } from './article-pipeline-behind.component';
import { ArticlePipelineChatComponent } from './article-pipeline-chat.component';
import { ArticlePipelineOutlineComponent } from './article-pipeline-outline.component';
import { ArticlePipelineRunStore } from './article-pipeline-run.store';
import { ArticlePipelineStepPanelComponent } from './article-pipeline-step-panel.component';

const INSPECTOR_OPEN_KEY = 'protopipe.studio.inspectorOpen';
const INSPECTOR_WIDTH_KEY = 'protopipe.studio.inspectorWidthPct';
const INSPECTOR_MODE_KEY = 'protopipe.studio.inspectorMode';
const INSPECTOR_WIDTH_DEFAULT = 38;
const INSPECTOR_WIDTH_MIN = 22;
const INSPECTOR_WIDTH_MAX = 70;

type InspectorMode = 'chat' | 'behind';

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
    ArticlePipelineChatComponent,
    ArticlePipelineBehindComponent,
    ArticlePipelineStepPanelComponent,
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
  private readonly bodyEl = viewChild<ElementRef<HTMLElement>>('body');

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

  readonly inspectorOpen = signal<boolean>(this.readInspectorOpen());
  readonly inspectorWidthPct = signal<number>(this.readInspectorWidth());
  readonly inspectorMode = signal<InspectorMode>(this.readInspectorMode());
  private dragMoveListener: ((e: PointerEvent) => void) | null = null;
  private dragUpListener: ((e: PointerEvent) => void) | null = null;

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

  async rerunActiveStep(step: ArticleGenerationStep): Promise<void> {
    await this.store.rerunStep(step);
    if (this.storeError()) {
      this.toast.add({
        severity: 'error',
        summary: 'Rerun failed',
        detail: this.storeError() ?? '',
        life: 4000,
      });
    }
  }

  // ---------- Inspector pane: toggle + mode + resize ----------

  toggleInspector(): void {
    const next = !this.inspectorOpen();
    this.inspectorOpen.set(next);
    try {
      localStorage.setItem(INSPECTOR_OPEN_KEY, next ? '1' : '0');
    } catch {
      /* localStorage unavailable */
    }
  }

  setInspectorMode(mode: InspectorMode): void {
    this.inspectorMode.set(mode);
    try {
      localStorage.setItem(INSPECTOR_MODE_KEY, mode);
    } catch {
      /* localStorage unavailable */
    }
  }

  onSplitterPointerDown(event: PointerEvent): void {
    const host = this.bodyEl()?.nativeElement;
    if (!host) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

    const move = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const fromRightPx = rect.right - e.clientX;
      const pct = clamp(
        (fromRightPx / rect.width) * 100,
        INSPECTOR_WIDTH_MIN,
        INSPECTOR_WIDTH_MAX,
      );
      this.inspectorWidthPct.set(Math.round(pct));
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.dragMoveListener = null;
      this.dragUpListener = null;
      try {
        localStorage.setItem(INSPECTOR_WIDTH_KEY, String(this.inspectorWidthPct()));
      } catch {
        /* localStorage unavailable */
      }
    };

    this.dragMoveListener = move;
    this.dragUpListener = up;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private readInspectorOpen(): boolean {
    try {
      const raw = localStorage.getItem(INSPECTOR_OPEN_KEY);
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  }

  private readInspectorWidth(): number {
    try {
      const raw = localStorage.getItem(INSPECTOR_WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) {
        return clamp(parsed, INSPECTOR_WIDTH_MIN, INSPECTOR_WIDTH_MAX);
      }
    } catch {
      /* ignore */
    }
    return INSPECTOR_WIDTH_DEFAULT;
  }

  private readInspectorMode(): InspectorMode {
    try {
      const raw = localStorage.getItem(INSPECTOR_MODE_KEY);
      if (raw === 'chat' || raw === 'behind') return raw;
    } catch {
      /* ignore */
    }
    return 'behind';
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
