import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { ProtopipeContentPost } from '@hive/contracts';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import {
  ARTICLE_POC_COGNITIVE_PACK_ID,
  ARTICLE_POC_POST_ID,
  ARTICLE_POC_SITE_ID,
} from './article-poc.constants';

function pickContentCandidate(posts: ProtopipeContentPost[]): ProtopipeContentPost | undefined {
  return (
    posts.find((p) => p.status === 'draft' && p.brief?.primaryKeywordPhrase) ??
    posts.find((p) => p.brief?.primaryKeywordPhrase) ??
    posts.find((p) => p.status === 'draft') ??
    posts[0]
  );
}

/**
 * Operator lab surface: one-click V2 article generation on a pinned content post
 * with Trains of Thought, then redirect to the live Thinker run view.
 *
 * Defaults to pinned DWP ids; override with ?siteId=&postId= or falls back to the
 * first draft post with a brief on the operator's bootstrap site.
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly packId = ARTICLE_POC_COGNITIVE_PACK_ID;
  readonly siteId = signal(ARTICLE_POC_SITE_ID);
  readonly postId = signal(ARTICLE_POC_POST_ID);
  readonly usingFallback = signal(false);

  readonly post = signal<ProtopipeContentPost | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly busy = signal(false);

  private queryOverride = false;

  constructor() {
    document.documentElement.classList.add('void-lab', 'void-white');
    this.destroyRef.onDestroy(() => {
      document.documentElement.classList.remove('void-lab', 'void-white');
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const siteParam = params.get('siteId')?.trim();
      const postParam = params.get('postId')?.trim();
      this.queryOverride = Boolean(siteParam || postParam);
      this.siteId.set(siteParam || ARTICLE_POC_SITE_ID);
      this.postId.set(postParam || ARTICLE_POC_POST_ID);
      this.usingFallback.set(false);
      this.loadPost();
    });
  }

  loadPost(): void {
    this.loadError.set(null);
    this.post.set(null);
    const siteId = this.siteId();
    const postId = this.postId();

    this.api.getContent$(siteId, postId).subscribe({
      next: ({ post }) => this.post.set(post),
      error: (err) => {
        if (
          !this.queryOverride &&
          err instanceof HttpErrorResponse &&
          err.status === 404
        ) {
          this.tryFallbackPost();
          return;
        }
        this.loadError.set(
          this.formatLoadError(err, siteId, postId),
        );
      },
    });
  }

  private tryFallbackPost(): void {
    this.api.bootstrap$().subscribe({
      next: (boot) => {
        const siteIds = [
          ...new Set([
            ARTICLE_POC_SITE_ID,
            ...boot.sites.map((s) => s.id),
          ]),
        ];
        if (siteIds.length === 0) {
          this.loadError.set(
            'No sites on your account. Complete onboarding first, or pass ?siteId=&postId=.',
          );
          return;
        }
        this.findPostAcrossSites(siteIds, boot.sites);
      },
      error: (err) =>
        this.loadError.set(parseProtopipeApiError(err, 'Could not load account bootstrap.')),
    });
  }

  private findPostAcrossSites(
    siteIds: string[],
    sites: { id: string; name?: string }[],
    index = 0,
  ): void {
    if (index >= siteIds.length) {
      const names = sites.map((s) => s.name?.trim() || s.id).join(', ');
      this.loadError.set(
        `No content posts with a brief found on any site (${names}). ` +
          `Open /home, confirm an article from your content plan, then return here — ` +
          `or use ?siteId=${ARTICLE_POC_SITE_ID}&postId=${ARTICLE_POC_POST_ID} if you have access to the DWP PoC post.`,
      );
      return;
    }

    const siteId = siteIds[index];
    this.api.listContent$(siteId).subscribe({
      next: ({ posts }) => {
        const candidate = pickContentCandidate(posts);
        if (!candidate) {
          this.findPostAcrossSites(siteIds, sites, index + 1);
          return;
        }

        this.siteId.set(siteId);
        this.postId.set(candidate.id);
        this.usingFallback.set(true);
        this.api.getContent$(siteId, candidate.id).subscribe({
          next: ({ post }) => this.post.set(post),
          error: (err) =>
            this.loadError.set(this.formatLoadError(err, siteId, candidate.id)),
        });
      },
      error: () => this.findPostAcrossSites(siteIds, sites, index + 1),
    });
  }

  private formatLoadError(err: unknown, siteId: string, postId: string): string {
    if (err instanceof HttpErrorResponse && err.status === 404) {
      return (
        `Content post not found (site ${siteId}, post ${postId}). ` +
        'It may belong to another account — open the writer for a post you own, or use ?siteId=&postId= on this URL.'
      );
    }
    return parseProtopipeApiError(err, 'Could not load the PoC content post.');
  }

  generateAndOpenThinker(): void {
    const current = this.post();
    const siteId = this.siteId();
    const postId = this.postId();
    if (!current?.brief) {
      this.actionError.set('This post has no brief. Open it from your content plan first.');
      return;
    }

    this.busy.set(true);
    this.actionError.set(null);

    const brief = {
      ...current.brief,
      cognitivePackId: this.packId,
    };

    this.api.updateContent$(siteId, postId, { brief }).subscribe({
      next: () => {
        this.api.generateContent$(siteId, postId).subscribe({
          next: ({ run, post }) => {
            this.post.set(post);
            this.busy.set(false);
            void this.router.navigate(
              ['/protopipe/lab/thinker/run', siteId, run.id],
              { queryParams: { postId } },
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
