import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ThoughtArtifactCardComponent } from './thought-artifact-card.component';
import type {
  Thought,
  ThoughtStep,
  ThoughtStepStatus,
} from './thought.model';
import { formatThinkerCostUsd, sumCosts } from './thinker-cost';

export type ThinkerAudience = 'operator' | 'customer';
export type ThinkerMode = 'calm' | 'debug';
type InspectorTab = 'logs' | 'events' | 'raw' | 'chat';

/**
 * The Thought view: drills into one run of a Thinker. Three panes — step rail,
 * stage (input -> output, artifacts, rerun diff) and a debug inspector
 * (logs / events / raw / chat). Calm by default; debug on demand. In customer
 * audience mode the internals collapse to friendly summaries + output previews.
 */
@Component({
  selector: 'app-thinker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThoughtArtifactCardComponent],
  templateUrl: './thinker.component.html',
  styleUrl: './thinker.component.scss',
})
export class ThinkerComponent {
  readonly thought = input.required<Thought>();
  readonly audience = input<ThinkerAudience>('operator');
  readonly mode = input<ThinkerMode>('calm');
  /** When false, step rerun is blocked (e.g. the run is actively progressing). */
  readonly canRerun = input<boolean>(true);

  readonly back = output<void>();
  readonly rerunStep = output<string>();
  readonly rerunFromStep = output<string>();
  readonly cancel = output<void>();

  private readonly _activeStepId = signal<string | null>(null);
  readonly inspectorTab = signal<InspectorTab>('logs');

  readonly isCustomer = computed(() => this.audience() === 'customer');
  readonly isDebug = computed(() => this.mode() === 'debug' && !this.isCustomer());

  readonly steps = computed(() => this.thought().steps);

  readonly activeStep = computed<ThoughtStep | null>(() => {
    const id = this._activeStepId() ?? this.defaultStepId();
    return this.steps().find((s) => s.id === id) ?? this.steps()[0] ?? null;
  });

  /** Active step follows the running step until the user picks one. */
  private defaultStepId(): string | undefined {
    const t = this.thought();
    if (t.currentStepId) return t.currentStepId;
    const running = t.steps.find((s) => s.status === 'running');
    if (running) return running.id;
    const lastDone = [...t.steps].reverse().find((s) => s.status !== 'pending');
    return lastDone?.id ?? t.steps[0]?.id;
  }

  readonly statusLabel = computed(() => {
    switch (this.thought().status) {
      case 'running': return 'Thinking';
      case 'complete': return 'Done';
      case 'failed': return 'Needs attention';
      case 'pending': return 'Queued';
      case 'cancelled': return 'Stopped';
      default: return 'Idle';
    }
  });

  readonly progress = computed(() => {
    const steps = this.steps();
    if (!steps.length) return 0;
    const done = steps.filter((s) => s.status === 'complete' || s.status === 'skipped').length;
    return Math.round((done / steps.length) * 100);
  });

  readonly totalCostLabel = computed(() => {
    const explicit = this.thought().totalCostUsd;
    if (explicit != null && explicit > 0) {
      return formatThinkerCostUsd(explicit);
    }
    const fromSteps = sumCosts(this.steps().map((s) => s.costUsd));
    return formatThinkerCostUsd(fromSteps);
  });

  readonly hasDiff = computed(() => {
    const s = this.activeStep();
    return !!s?.previousOutput?.length && !!s?.output?.length;
  });

  readonly activeEvents = computed(() => this.activeStep()?.events ?? []);

  readonly rawJson = computed<string>(() => {
    const s = this.activeStep();
    if (!s) return '';
    try {
      return JSON.stringify(
        { id: s.id, status: s.status, attempt: s.attempt, input: s.input, output: s.output, error: s.error },
        null,
        2,
      );
    } catch {
      return '';
    }
  });

  selectStep(id: string): void {
    this._activeStepId.set(id);
  }

  setTab(tab: InspectorTab): void {
    this.inspectorTab.set(tab);
  }

  stepStatusClass(status: ThoughtStepStatus): string {
    return `is-${status}`;
  }

  formatDuration(ms?: number): string {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${Math.round(s % 60)}s`;
  }

  formatCost(costUsd?: number): string | null {
    return formatThinkerCostUsd(costUsd);
  }

  formatTime(iso?: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  }
}
