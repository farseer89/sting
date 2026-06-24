import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProtopipeMerchBookRunDto } from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

export type MerchBookSection = 'new' | 'runs' | 'logo' | 'products' | 'mockups' | 'order';

const MOCKUP_POLL_MS = 3_000;
const MOCKUP_POLL_MAX_ATTEMPTS = 30;

@Injectable()
export class ProtopipeMerchBookStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _running = signal(false);
  private readonly _mockupsGenerating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _runs = signal<ProtopipeMerchBookRunDto[]>([]);
  private readonly _activeRunId = signal<string | null>(null);
  private readonly _section = signal<MerchBookSection>('new');
  private readonly _label = signal('');
  private readonly _logoPrompt = signal('');

  readonly loading = this._loading.asReadonly();
  readonly running = this._running.asReadonly();
  readonly mockupsGenerating = this._mockupsGenerating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly activeRunId = this._activeRunId.asReadonly();
  readonly section = this._section.asReadonly();
  readonly label = this._label.asReadonly();
  readonly logoPrompt = this._logoPrompt.asReadonly();

  readonly activeRun = computed(() => {
    const id = this._activeRunId();
    if (!id) return this._runs()[0] ?? null;
    return this._runs().find((r) => r.id === id) ?? null;
  });

  readonly selectedLogo = computed(() =>
    this.activeRun()?.logoConcepts.find((c) => c.status === 'selected') ?? null,
  );

  readonly totalCostUsd = computed(() =>
    this._runs().reduce((sum, r) => sum + (r.costUsd ?? 0), 0),
  );

  setSection(section: MerchBookSection): void {
    this._section.set(section);
  }

  setLabel(value: string): void {
    this._label.set(value);
  }

  setLogoPrompt(value: string): void {
    this._logoPrompt.set(value);
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
      const res = await this.api.listMerchBookRuns(siteId);
      this._runs.set(res.runs);
      if (!this._activeRunId() && res.runs.length > 0) {
        this._activeRunId.set(res.runs[0].id);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load merch runs'));
    } finally {
      this._loading.set(false);
    }
  }

  private upsertRun(run: ProtopipeMerchBookRunDto): void {
    this._runs.update((list) => list.map((r) => (r.id === run.id ? run : r)));
  }

  private async refreshRun(siteId: string, runId: string): Promise<ProtopipeMerchBookRunDto | null> {
    try {
      const res = await this.api.getMerchBookRun(siteId, runId);
      this.upsertRun(res.run);
      return res.run;
    } catch {
      return null;
    }
  }

  private async pollMockupsUntilReady(siteId: string, runId: string): Promise<void> {
    this._mockupsGenerating.set(true);
    try {
      for (let attempt = 0; attempt < MOCKUP_POLL_MAX_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, MOCKUP_POLL_MS));
        const run = await this.refreshRun(siteId, runId);
        if (!run) return;

        const mockups = run.mockups;
        if (!mockups.length) continue;

        const allSettled = mockups.every((m) => m.status === 'ready' || m.status === 'failed');
        if (allSettled) {
          if (mockups.some((m) => m.status === 'ready')) {
            this._section.set('mockups');
          }
          return;
        }
      }
    } finally {
      this._mockupsGenerating.set(false);
    }
  }

  async createRun(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }

    this._running.set(true);
    this._error.set(null);
    try {
      const res = await this.api.createMerchBookRun(siteId, {
        label: this._label().trim() || undefined,
        recipe: 'starter_pack',
        logoPrompt: this._logoPrompt().trim() || undefined,
      });
      this._runs.update((list) => [res.run, ...list.filter((r) => r.id !== res.run.id)]);
      this._activeRunId.set(res.run.id);
      this._section.set('logo');
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Merch run failed'));
      return false;
    } finally {
      this._running.set(false);
    }
  }

  async setLogoConceptStatus(
    runId: string,
    conceptId: string,
    status: 'selected' | 'rejected' | 'pending',
  ): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    try {
      const res = await this.api.patchMerchBookLogoConcept(siteId, runId, conceptId, { status });
      this.upsertRun(res.run);

      if (status === 'selected' && res.run.logoConcepts.find((c) => c.id === conceptId)?.imageUrl) {
        void this.pollMockupsUntilReady(siteId, runId);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not update logo concept'));
    }
  }

  async regenerateMockups(): Promise<void> {
    const siteId = this.strategy.siteId();
    const run = this.activeRun();
    if (!siteId || !run) return;

    this._error.set(null);
    try {
      const res = await this.api.generateMerchBookMockups(siteId, run.id);
      this.upsertRun(res.run);
      void this.pollMockupsUntilReady(siteId, run.id);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not start mockup generation'));
    }
  }
}
