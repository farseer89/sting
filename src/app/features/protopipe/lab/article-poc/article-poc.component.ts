import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ProtopipeContentPost } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import {
  ARTICLE_POC_COGNITIVE_PACK_ID,
  ARTICLE_POC_POST_ID,
  ARTICLE_POC_SITE_ID,
} from './article-poc.constants';

/**
 * Operator lab surface: one-click V2 article generation on a pinned content post
 * with Trains of Thought, then redirect to the live Thinker run view.
 */
@Component({
  selector: 'app-article-poc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './article-poc.component.html',
  styleUrl: './article-poc.component.scss',
})
export class ArticlePocComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly siteId = ARTICLE_POC_SITE_ID;
  readonly postId = ARTICLE_POC_POST_ID;
  readonly packId = ARTICLE_POC_COGNITIVE_PACK_ID;

  readonly post = signal<ProtopipeContentPost | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    document.documentElement.classList.add('void-lab', 'void-white');
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  ngOnInit(): void {
    this.loadPost();
  }

  loadPost(): void {
    this.loadError.set(null);
    this.api.getContent$(this.siteId, this.postId).subscribe({
      next: ({ post }) => this.post.set(post),
      error: (err) =>
        this.loadError.set(parseProtopipeApiError(err, 'Could not load the PoC content post.')),
    });
  }

  generateAndOpenThinker(): void {
    const current = this.post();
    if (!current?.brief) {
      this.actionError.set('PoC post has no brief. It must be seeded from a content plan.');
      return;
    }

    this.busy.set(true);
    this.actionError.set(null);

    const brief = {
      ...current.brief,
      cognitivePackId: this.packId,
    };

    this.api.updateContent$(this.siteId, this.postId, { brief }).subscribe({
      next: () => {
        this.api.generateContent$(this.siteId, this.postId).subscribe({
          next: ({ run, post }) => {
            this.post.set(post);
            this.busy.set(false);
            void this.router.navigate(
              ['/protopipe/lab/thinker/run', this.siteId, run.id],
              { queryParams: { postId: this.postId } },
            );
          },
          error: (err) => {
            this.busy.set(false);
            this.actionError.set(
              parseProtopipeApiError(err, 'Article generation could not be started.'),
            );
          },
        });
      },
      error: (err) => {
        this.busy.set(false);
        this.actionError.set(
          parseProtopipeApiError(err, 'Could not save the thought pack on the PoC post.'),
        );
      },
    });
  }

  keywordLabel(): string {
    const p = this.post();
    return (
      p?.brief?.primaryKeywordPhrase?.trim() ||
      p?.template?.primaryKeywordPhrase?.trim() ||
      'Unknown keyword'
    );
  }
}
