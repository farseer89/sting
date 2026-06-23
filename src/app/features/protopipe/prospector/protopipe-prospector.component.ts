import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ProtopipeProspectorService } from './protopipe-prospector.service';
import { ProtopipeProspectorAvatarFormComponent } from './protopipe-prospector-avatar-form.component';
import { ProtopipeHomeThinkerViewState } from '../home/protopipe-home-thinker-view.state';
import { ProtopipeHomeThinkerBinderComponent } from '../home/thinker/protopipe-home-thinker-binder.component';
import type { ProspectorRunDto } from './prospector-run.model';

export type ProspectorSection = 'new-search' | 'leads';

function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return 'yesterday';
  return `${Math.floor(h / 24)}d ago`;
}

@Component({
  selector: 'app-protopipe-prospector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProtopipeProspectorAvatarFormComponent,
    ProtopipeHomeThinkerBinderComponent,
  ],
  templateUrl: './protopipe-prospector.component.html',
  styleUrl: './protopipe-prospector.component.scss',
})
export class ProtopipeProspectorComponent implements OnInit {
  private readonly service = inject(ProtopipeProspectorService);
  readonly thinkerView = inject(ProtopipeHomeThinkerViewState);

  readonly activeSection = signal<ProspectorSection>('new-search');
  readonly runs = signal<ProspectorRunDto[]>([]);
  readonly runsLoading = signal(true);
  readonly runsError = signal<string | null>(null);
  readonly launching = signal(false);
  readonly launchError = signal<string | null>(null);

  readonly totalLeads = computed(() =>
    this.runs().reduce((acc, r) => acc + (r.artifacts.scoredLeads?.length ?? 0), 0),
  );

  readonly totalCost = computed(() =>
    this.runs().reduce((acc, r) => acc + (r.totalCostUsd ?? 0), 0),
  );

  constructor() {
    this.thinkerView.setFocusBackLabel('Back to searches');
    this.thinkerView.setExitHandler(() => this.activeSection.set('new-search'));
  }

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.service.listRuns();
      this.runs.set(list);
    } catch {
      this.runsError.set('Could not load recent searches.');
    } finally {
      this.runsLoading.set(false);
    }
  }

  async onSearch(input: { category: string; location: string }): Promise<void> {
    this.launching.set(true);
    this.launchError.set(null);

    try {
      const run = await this.service.createRun(input.category, input.location);
      this.runs.update((prev) => [run, ...prev]);
      this.openRunEmbedded(run);
    } catch {
      this.launchError.set('Failed to start search. Please try again.');
    } finally {
      this.launching.set(false);
    }
  }

  openRunEmbedded(run: ProspectorRunDto): void {
    this.thinkerView.setProspectorRunEmbedded(run);
    this.activeSection.set('leads');
  }

  runStatusClass(run: ProspectorRunDto): string {
    switch (run.status) {
      case 'complete': return 'complete';
      case 'failed': return 'failed';
      case 'running':
      case 'pending': return 'running';
      default: return 'pending';
    }
  }

  relativeTime = relativeTime;

  formatCost(usd: number | undefined): string {
    if (!usd) return '';
    return `$${usd.toFixed(4)}`;
  }

  leadCount(run: ProspectorRunDto): number {
    return run.artifacts.scoredLeads?.length ?? 0;
  }

  criticalCount(run: ProspectorRunDto): number {
    return run.artifacts.scoredLeads?.filter((l) => l.priority === 'critical').length ?? 0;
  }
}
