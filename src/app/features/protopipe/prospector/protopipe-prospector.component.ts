import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ProtopipeProspectorService } from './protopipe-prospector.service';
import { ProtopipeProspectorAvatarFormComponent } from './protopipe-prospector-avatar-form.component';
import { ProtopipeProspectorRunnerComponent } from './protopipe-prospector-runner.component';
import { ProtopipeProspectorResultsComponent } from './protopipe-prospector-results.component';
import type { ProspectorRunDto } from './prospector-run.model';

type ProspectorView = 'form' | 'running' | 'results';

@Component({
  selector: 'app-protopipe-prospector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProtopipeProspectorAvatarFormComponent,
    ProtopipeProspectorRunnerComponent,
    ProtopipeProspectorResultsComponent,
  ],
  template: `
    <div class="psp-shell">
      <div class="psp-masthead">
        <div>
          <h1 class="psp-masthead__title">Prospector</h1>
          <p class="psp-masthead__deck">Find and score local businesses for outbound pitch.</p>
        </div>
        @if (view() === 'results') {
          <button class="psp-btn psp-btn--ghost" (click)="reset()">New search</button>
        }
      </div>

      <div class="psp-body">
        @if (view() === 'form') {
          <app-protopipe-prospector-avatar-form
            [loading]="launching()"
            [error]="launchError()"
            (search)="onSearch($event)"
          />
        }

        @if (view() === 'running' || view() === 'results') {
          <app-protopipe-prospector-runner
            [run]="activeRun()"
          />
        }

        @if (view() === 'results') {
          <app-protopipe-prospector-results
            [run]="activeRun()!"
          />
        }
      </div>
    </div>
  `,
  styleUrl: './protopipe-prospector.component.scss',
})
export class ProtopipeProspectorComponent implements OnDestroy {
  private readonly service = inject(ProtopipeProspectorService);

  readonly view = signal<ProspectorView>('form');
  readonly activeRun = signal<ProspectorRunDto | null>(null);
  readonly launching = signal(false);
  readonly launchError = signal<string | null>(null);

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasResults = computed(() => {
    const run = this.activeRun();
    return run?.status === 'complete' || (run?.artifacts?.scoredLeads?.length ?? 0) > 0;
  });

  async onSearch(input: { category: string; location: string }): Promise<void> {
    this.launching.set(true);
    this.launchError.set(null);

    try {
      const run = await this.service.createRun(input.category, input.location);
      this.activeRun.set(run);
      this.view.set('running');
      this.startPolling(run.id);
    } catch {
      this.launchError.set('Failed to start search. Please try again.');
      this.launching.set(false);
    }
  }

  reset(): void {
    this.stopPolling();
    this.activeRun.set(null);
    this.launchError.set(null);
    this.launching.set(false);
    this.view.set('form');
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(runId: string): void {
    this.stopPolling();
    this.launching.set(false);
    this.scheduleNextPoll(runId);
  }

  private scheduleNextPoll(runId: string): void {
    this.pollTimer = setTimeout(() => void this.poll(runId), 1500);
  }

  private async poll(runId: string): Promise<void> {
    try {
      const run = await this.service.getRun(runId);
      this.activeRun.set(run);

      if (run.status === 'complete') {
        this.view.set('results');
        return;
      }
      if (run.status === 'failed') {
        this.view.set('results');
        return;
      }

      // Transition to results view as soon as scored leads land (before pitch is done)
      if ((run.artifacts?.scoredLeads?.length ?? 0) > 0 && this.view() === 'running') {
        this.view.set('results');
      }

      this.scheduleNextPoll(runId);
    } catch {
      this.scheduleNextPoll(runId);
    }
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
