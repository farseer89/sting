import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { ProgressSpinner } from 'primeng/progressspinner';
import type {
  EnrichmentDto,
  EnrichmentStatus,
  EnrichmentStep,
} from './prospector-run.model';
import {
  ENRICHMENT_STEP_LABELS,
  ENRICHMENT_STEPS_ORDERED,
  type ProspectorScoredLead,
} from './prospector-run.model';
import { ProtopipeProspectorService } from './protopipe-prospector.service';

const POLL_INTERVAL_MS = 2500;

@Component({
  selector: 'app-protopipe-prospector-lead-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Button, Drawer, ProgressSpinner],
  templateUrl: './protopipe-prospector-lead-drawer.component.html',
  styleUrl: './protopipe-prospector-lead-drawer.component.scss',
})
export class ProtopipeProspectorLeadDrawerComponent implements OnDestroy {
  private readonly svc = inject(ProtopipeProspectorService);

  readonly lead = input<ProspectorScoredLead | null>(null);
  readonly visible = model<boolean>(false);

  readonly enrichment = signal<EnrichmentDto | null>(null);
  readonly enrichLoading = signal(false);
  readonly enrichError = signal<string | null>(null);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastPlaceId: string | null = null;

  readonly stepsOrdered = ENRICHMENT_STEPS_ORDERED;
  readonly stepLabels = ENRICHMENT_STEP_LABELS;

  readonly isEnriching = computed(() => {
    const s = this.enrichment()?.status;
    return s === 'pending' || s === 'running';
  });

  readonly canEnrich = computed(() => {
    const e = this.enrichment();
    if (!e) return true;
    return e.status === 'failed';
  });

  readonly priorityLabel = computed(() => {
    const lead = this.lead();
    if (!lead) return '';
    const map: Record<string, string> = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      monitor: 'Monitor',
    };
    return map[lead.priority] ?? lead.priority;
  });

  constructor() {
    effect(() => {
      const lead = this.lead();
      const visible = this.visible();

      if (!visible || !lead) {
        this.stopPolling();
        return;
      }

      if (lead.placeId === this.lastPlaceId) return;
      this.lastPlaceId = lead.placeId;
      this.enrichment.set(null);
      this.enrichError.set(null);
      this.stopPolling();

      void this.loadExistingEnrichment(lead.placeId);
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  async enrich(): Promise<void> {
    const lead = this.lead();
    if (!lead) return;

    this.enrichLoading.set(true);
    this.enrichError.set(null);
    try {
      const dto = await this.svc.triggerEnrichment(lead.placeId, lead.websiteUri);
      this.enrichment.set(dto);
      if (dto.status !== 'complete') {
        this.startPolling(lead.placeId);
      }
    } catch {
      this.enrichError.set('Failed to start enrichment. Please try again.');
    } finally {
      this.enrichLoading.set(false);
    }
  }

  onHide(): void {
    this.stopPolling();
    this.lastPlaceId = null;
  }

  stepStatus(step: EnrichmentStep): 'done' | 'active' | 'pending' | 'failed' {
    const e = this.enrichment();
    if (!e) return 'pending';
    if (e.status === 'failed' && e.error?.step === step) return 'failed';
    const doneIdx = ENRICHMENT_STEPS_ORDERED.indexOf(
      e.currentStep === 'done' ? 'extract_info' : e.currentStep,
    );
    const stepIdx = ENRICHMENT_STEPS_ORDERED.indexOf(step);
    if (e.status === 'complete' || stepIdx < doneIdx) return 'done';
    if (e.currentStep === step && e.status === 'running') return 'active';
    return 'pending';
  }

  stepEvent(step: EnrichmentStep) {
    return this.enrichment()?.events.find((ev) => ev.step === step && ev.status !== 'started');
  }

  formatCost(usd: number | undefined): string {
    if (!usd) return '';
    if (usd < 0.001) return '<$0.001';
    return `$${usd.toFixed(3)}`;
  }

  formatDuration(ms: number | undefined): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private async loadExistingEnrichment(placeId: string): Promise<void> {
    try {
      const dto = await this.svc.getEnrichment(placeId);
      this.enrichment.set(dto);
      if (dto.status === 'pending' || dto.status === 'running') {
        this.startPolling(placeId);
      }
    } catch {
      // 404 means no enrichment yet — that's fine
    }
  }

  private startPolling(placeId: string): void {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      try {
        const dto = await this.svc.getEnrichment(placeId);
        this.enrichment.set(dto);
        if (dto.status === 'complete' || dto.status === 'failed') {
          this.stopPolling();
        }
      } catch {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
