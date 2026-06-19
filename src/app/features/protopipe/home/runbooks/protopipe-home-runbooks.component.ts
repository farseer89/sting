import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type {
  ArticleGenerationRunSummary,
  ProtopipeContentPlanRunSummary,
  ProtopipeKeywordDiscoveryRunDto,
} from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ContentPlanService } from '../../content-plan/content-plan.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import type { RunbookKind } from './protopipe-runbook-viewer.component';
import { ProtopipeRunbookViewerComponent } from './protopipe-runbook-viewer.component';

export interface RunbookSelection {
  kind: RunbookKind;
  runId: string;
  label: string;
}

type RunbookSection = 'discovery' | 'content-plan' | 'articles';

function formatWhen(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusClass(status: string): string {
  return status.replace(/_/g, '-');
}

@Component({
  selector: 'app-protopipe-home-runbooks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeRunbookViewerComponent],
  templateUrl: './protopipe-home-runbooks.component.html',
  styleUrl: './protopipe-home-runbooks.component.scss',
})
export class ProtopipeHomeRunbooksComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly contentPlanApi = inject(ContentPlanService);

  readonly siteId = input.required<string>();

  readonly discoveryRun = signal<ProtopipeKeywordDiscoveryRunDto | null>(null);
  readonly contentPlanRuns = signal<ProtopipeContentPlanRunSummary[]>([]);
  readonly articleRuns = signal<ArticleGenerationRunSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly selection = signal<RunbookSelection | null>(null);
  readonly binderSection = signal<RunbookSection>('discovery');

  readonly latestContentPlan = computed(() => this.contentPlanRuns()[0] ?? null);

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    const siteId = this.siteId();
    if (!siteId) return;

    this.loading.set(true);
    this.loadError.set(null);

    try {
      const [discoveryRes, planRunsRes, articleRunsRes] = await Promise.all([
        this.api.getLatestKeywordDiscoveryRun(siteId),
        this.contentPlanApi.listRuns(siteId),
        this.api.listArticleGenerationRuns(siteId),
      ]);
      this.discoveryRun.set(discoveryRes.run);
      this.contentPlanRuns.set(planRunsRes.runs);
      this.articleRuns.set(articleRunsRes.runs);
    } catch (err) {
      this.loadError.set(parseProtopipeApiError(err, 'Could not load runbooks.'));
    } finally {
      this.loading.set(false);
    }
  }

  openDiscovery(): void {
    const run = this.discoveryRun();
    if (!run) return;
    this.selection.set({
      kind: 'keyword-discovery',
      runId: run.id,
      label: 'Keyword discovery',
    });
  }

  openContentPlan(run: ProtopipeContentPlanRunSummary): void {
    this.selection.set({
      kind: 'content-plan',
      runId: run.id,
      label: `Content plan v${run.version}`,
    });
  }

  openArticle(run: ArticleGenerationRunSummary): void {
    this.selection.set({
      kind: 'article',
      runId: run.id,
      label: `Article · ${run.articleType.replace(/_/g, ' ')}`,
    });
  }

  closeViewer(): void {
    this.selection.set(null);
    void this.reload();
  }

  formatWhen = formatWhen;
  statusClass = statusClass;
}
