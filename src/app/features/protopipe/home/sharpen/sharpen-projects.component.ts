import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import type {
  ProtopipeProject,
  ProtopipeProjectCapture,
} from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProjectCheckInComponent } from '../../projects/project-check-in.component';

@Component({
  selector: 'app-sharpen-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectCheckInComponent],
  templateUrl: './sharpen-projects.component.html',
  styleUrl: './sharpen-projects.component.scss',
})
export class SharpenProjectsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);

  readonly siteId = input.required<string>();
  readonly changed = output<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeProjects = signal<ProtopipeProject[]>([]);
  readonly completedProjects = signal<ProtopipeProject[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly detailLoading = signal(false);
  readonly captures = signal<ProtopipeProjectCapture[]>([]);
  readonly selectedProject = signal<ProtopipeProject | null>(null);
  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly shareUrl = signal<string | null>(null);
  readonly shareBusy = signal(false);
  readonly newTitle = signal('');
  readonly newService = signal('');
  readonly newLocation = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.listProjects$(this.siteId(), { status: 'active' }).subscribe({
      next: (activeRes) => {
        this.activeProjects.set(activeRes.projects ?? []);
        this.api.listProjects$(this.siteId(), { status: 'completed' }).subscribe({
          next: (completedRes) => {
            this.completedProjects.set(completedRes.projects ?? []);
            this.loading.set(false);
            this.changed.emit();
          },
          error: (err) => {
            this.error.set(parseProtopipeApiError(err, 'Could not load projects.'));
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not load projects.'));
        this.loading.set(false);
      },
    });
  }

  toggleCreate(show: boolean): void {
    this.showCreate.set(show);
    if (!show) {
      this.newTitle.set('');
      this.newService.set('');
      this.newLocation.set('');
    }
  }

  onNewField(field: 'title' | 'service' | 'location', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'title') this.newTitle.set(value);
    if (field === 'service') this.newService.set(value);
    if (field === 'location') this.newLocation.set(value);
  }

  createProject(): void {
    const title = this.newTitle().trim();
    if (!title) return;

    this.creating.set(true);
    this.api
      .createProject$(this.siteId(), {
        title,
        serviceType: this.newService().trim() || undefined,
        locationLabel: this.newLocation().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.creating.set(false);
          this.toggleCreate(false);
          this.reload();
          if (res.project?.id) this.selectProject(res.project.id);
        },
        error: (err) => {
          this.creating.set(false);
          this.error.set(parseProtopipeApiError(err, 'Could not create project.'));
        },
      });
  }

  selectProject(projectId: string): void {
    if (this.selectedId() === projectId) {
      this.selectedId.set(null);
      this.selectedProject.set(null);
      this.captures.set([]);
      this.shareUrl.set(null);
      return;
    }

    this.selectedId.set(projectId);
    this.detailLoading.set(true);
    this.shareUrl.set(null);

    this.api.getProject$(this.siteId(), projectId).subscribe({
      next: (res) => {
        this.selectedProject.set(res.project);
        this.captures.set(res.captures ?? []);
        this.detailLoading.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not load project.'));
        this.detailLoading.set(false);
      },
    });
  }

  onCheckInSubmitted(): void {
    const id = this.selectedId();
    if (!id) return;
    this.api.getProject$(this.siteId(), id).subscribe({
      next: (res) => {
        this.selectedProject.set(res.project);
        this.captures.set(res.captures ?? []);
        this.reload();
      },
    });
  }

  generateShareLink(): void {
    const id = this.selectedId();
    if (!id) return;

    this.shareBusy.set(true);
    this.api.generateProjectShareLink$(this.siteId(), id).subscribe({
      next: (res) => {
        this.shareUrl.set(res.shareUrl);
        this.shareBusy.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not generate share link.'));
        this.shareBusy.set(false);
      },
    });
  }

  async copyShareLink(): Promise<void> {
    const url = this.shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard may fail on insecure contexts
    }
  }

  markComplete(): void {
    const id = this.selectedId();
    if (!id) return;

    this.api.patchProject$(this.siteId(), id, { status: 'completed' }).subscribe({
      next: (res) => {
        this.selectedProject.set(res.project);
        this.reload();
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Could not update project.'));
      },
    });
  }

  daysActive(project: ProtopipeProject): number {
    if (!project.startedAt) return 0;
    const start = new Date(project.startedAt).getTime();
    const end = project.completedAt
      ? new Date(project.completedAt).getTime()
      : Date.now();
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  readinessPercent(project: ProtopipeProject): number {
    return Math.round(project.storyReadiness * 100);
  }

  formatCaptureDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
