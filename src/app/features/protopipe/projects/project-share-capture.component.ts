import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { ProtopipeProjectShareView } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProjectCheckInComponent } from './project-check-in.component';

@Component({
  selector: 'app-project-share-capture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectCheckInComponent],
  template: `
    <main class="share-page">
      @if (loading()) {
        <p class="share-page__status" aria-busy="true">Loading project…</p>
      } @else if (error()) {
        <p class="share-page__status share-page__status--error">{{ error() }}</p>
      } @else if (project(); as p) {
        <app-project-check-in
          mode="share"
          [shareToken]="token()"
          [projectTitle]="p.title"
          [serviceType]="p.serviceType"
          [locationLabel]="p.locationLabel"
        />
      }
    </main>
  `,
  styles: `
    .share-page {
      min-height: 100dvh;
      max-width: 32rem;
      margin: 0 auto;
      padding: 1rem 1rem 2rem;
      box-sizing: border-box;
    }

    .share-page__status {
      margin: 2rem 0;
      text-align: center;
      font-size: 0.9375rem;
    }

    .share-page__status--error {
      color: #b91c1c;
    }
  `,
})
export class ProjectShareCaptureComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly route = inject(ActivatedRoute);

  readonly token = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly project = signal<ProtopipeProjectShareView | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.token.set(token);
    if (!token) {
      this.error.set('Invalid share link');
      this.loading.set(false);
      return;
    }

    this.api.getProjectShare$(token).subscribe({
      next: (res) => {
        this.project.set(res.project);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(parseProtopipeApiError(err, 'Share link not found or expired'));
        this.loading.set(false);
      },
    });
  }
}
