import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeResearchBookFact,
  ProtopipeResearchBookRunDto,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

export type ResearchBookSection = 'new' | 'runs' | 'pinned';

@Injectable()
export class ProtopipeResearchBookStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _running = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _runs = signal<ProtopipeResearchBookRunDto[]>([]);
  private readonly _activeRunId = signal<string | null>(null);
  private readonly _section = signal<ResearchBookSection>('new');
  private readonly _topic = signal('');
  private readonly _maxPages = signal(5);

  readonly loading = this._loading.asReadonly();
  readonly running = this._running.asReadonly();
  readonly error = this._error.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly activeRunId = this._activeRunId.asReadonly();
  readonly section = this._section.asReadonly();
  readonly topic = this._topic.asReadonly();
  readonly maxPages = this._maxPages.asReadonly();

  readonly activeRun = computed(() => {
    const id = this._activeRunId();
    if (!id) return this._runs()[0] ?? null;
    return this._runs().find((r) => r.id === id) ?? null;
  });

  readonly pinnedFacts = computed(() => {
    const out: { run: ProtopipeResearchBookRunDto; fact: ProtopipeResearchBookFact }[] = [];
    for (const run of this._runs()) {
      for (const fact of run.facts) {
        if (fact.status === 'pinned') {
          out.push({ run, fact });
        }
      }
    }
    return out;
  });

  readonly totalCostUsd = computed(() =>
    this._runs().reduce((sum, r) => sum + (r.costUsd ?? 0), 0),
  );

  setSection(section: ResearchBookSection): void {
    this._section.set(section);
  }

  setTopic(value: string): void {
    this._topic.set(value);
  }

  setMaxPages(value: number): void {
    this._maxPages.set(Math.max(1, Math.min(8, value)));
  }

  selectRun(runId: string): void {
    this._activeRunId.set(runId);
    this._section.set('runs');
  }

  async ensureContext(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.loadRuns();
  }

  async loadRuns(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.listResearchBookRuns(siteId);
      this._runs.set(res.runs);
      if (!this._activeRunId() && res.runs.length > 0) {
        this._activeRunId.set(res.runs[0].id);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load research runs'));
    } finally {
      this._loading.set(false);
    }
  }

  async runResearch(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    const topic = this._topic().trim();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }
    if (!topic) {
      this._error.set('Enter a topic to research');
      return false;
    }

    this._running.set(true);
    this._error.set(null);
    try {
      const res = await this.api.createResearchBookRun(siteId, {
        topic,
        recipe: 'serp_extract',
        maxPages: this._maxPages(),
      });
      this._runs.update((list) => [res.run, ...list.filter((r) => r.id !== res.run.id)]);
      this._activeRunId.set(res.run.id);
      this._section.set('runs');
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Research run failed'));
      return false;
    } finally {
      this._running.set(false);
    }
  }

  async setFactStatus(
    runId: string,
    factId: string,
    status: 'pinned' | 'rejected' | 'pending',
  ): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    try {
      const res = await this.api.patchResearchBookFact(siteId, runId, factId, { status });
      this._runs.update((list) => list.map((r) => (r.id === res.run.id ? res.run : r)));
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not update fact'));
    }
  }
}
