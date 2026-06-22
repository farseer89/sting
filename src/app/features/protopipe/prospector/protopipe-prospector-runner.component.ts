import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  type ProspectorRunDto,
  type ProspectorStep,
  type ProspectorStepEvent,
  PROSPECTOR_STEP_LABELS,
  PROSPECTOR_STEPS_ORDERED,
} from './prospector-run.model';

interface StepRow {
  step: ProspectorStep;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  durationMs?: number;
  costUsd?: number;
  note?: string;
  error?: string;
}

@Component({
  selector: 'app-protopipe-prospector-runner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="runner">
      <div class="runner__header">
        <div class="runner__meta">
          <span class="runner__query">{{ queryLabel() }}</span>
          <span class="runner__status" [class]="'runner__status--' + (run()?.status ?? 'pending')">
            {{ statusLabel() }}
          </span>
        </div>
        @if ((run()?.totalCostUsd ?? 0) > 0) {
          <div class="runner__cost">
            Total cost: <strong>{{ formatCost(run()?.totalCostUsd) }}</strong>
          </div>
        }
      </div>

      <div class="runner__steps">
        @for (row of stepRows(); track row.step) {
          <div class="runner__step" [class]="'runner__step--' + row.status">
            <div class="runner__step-icon">
              @if (row.status === 'complete') { ✓ }
              @else if (row.status === 'failed') { ✕ }
              @else if (row.status === 'running') {
                <span class="runner__spinner"></span>
              } @else { · }
            </div>
            <div class="runner__step-body">
              <span class="runner__step-label">{{ row.label }}</span>
              @if (row.note) {
                <span class="runner__step-note">{{ row.note }}</span>
              }
              @if (row.error) {
                <span class="runner__step-error">{{ row.error }}</span>
              }
            </div>
            <div class="runner__step-meta">
              @if (row.costUsd && row.costUsd > 0) {
                <span class="runner__step-cost">{{ formatCost(row.costUsd) }}</span>
              }
              @if (row.durationMs) {
                <span class="runner__step-dur">{{ formatDuration(row.durationMs) }}</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './protopipe-prospector-runner.component.scss',
})
export class ProtopipeProspectorRunnerComponent {
  readonly run = input<ProspectorRunDto | null>(null);

  readonly queryLabel = computed(() => {
    const r = this.run();
    if (!r) return '';
    return `${r.input.category} · ${r.input.location}`;
  });

  readonly statusLabel = computed(() => {
    const r = this.run();
    if (!r) return 'Pending';
    const map: Record<string, string> = {
      pending: 'Pending',
      running: 'Running…',
      complete: 'Complete',
      failed: 'Failed',
    };
    return map[r.status] ?? r.status;
  });

  readonly stepRows = computed((): StepRow[] => {
    const run = this.run();
    if (!run) return [];

    const eventMap = new Map<ProspectorStep, ProspectorStepEvent[]>();
    for (const ev of run.events) {
      const list = eventMap.get(ev.step) ?? [];
      list.push(ev);
      eventMap.set(ev.step, list);
    }

    return PROSPECTOR_STEPS_ORDERED.map((step): StepRow => {
      const events = eventMap.get(step) ?? [];
      const completed = events.find((e) => e.status === 'completed');
      const failed = events.find((e) => e.status === 'failed');
      const started = events.find((e) => e.status === 'started');

      let status: StepRow['status'] = 'pending';
      if (completed) status = 'complete';
      else if (failed) status = 'failed';
      else if (run.currentStep === step && run.status === 'running') status = 'running';
      else if (started) status = 'running';

      return {
        step,
        label: PROSPECTOR_STEP_LABELS[step],
        status,
        durationMs: completed?.durationMs,
        costUsd: completed?.costUsd,
        note: completed?.note ?? failed?.note,
        error: failed?.error,
      };
    });
  });

  formatCost(usd: number | undefined | null): string {
    if (!usd || usd === 0) return '';
    if (usd < 0.01) return `$${(usd * 1000).toFixed(3)}m`;
    return `$${usd.toFixed(4)}`;
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}
