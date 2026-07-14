import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ProtopipeContentPost } from '@hive/contracts';
import { ProtopipeBuildBookService } from '../../build-book/protopipe-build-book.service';
import {
  ProtopipeBuildPageCanvasComponent,
  type BuildPageBlockState,
} from '../../build-book/canvas/build-page-canvas.component';
import { ProtopipeContentService } from '../../protopipe-content.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { siteThemeTokensToCssVars } from '../../site-design/site-theme.util';
import { ProtopipeBlogPreviewNavState } from '../protopipe-blog-preview-nav.state';
import { resolveBlogPreviewStack } from './resolve-blog-preview-stack.util';

@Component({
  selector: 'app-protopipe-home-blog-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildPageCanvasComponent],
  templateUrl: './protopipe-home-blog-preview.component.html',
  styleUrl: './protopipe-home-blog-preview.component.scss',
})
export class ProtopipeHomeBlogPreviewComponent implements OnInit {
  readonly contentPostId = input.required<string>();
  readonly titleHint = input<string | undefined>(undefined);
  readonly exit = output<void>();

  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly content = inject(ProtopipeContentService);
  private readonly buildBook = inject(ProtopipeBuildBookService);
  private readonly nav = inject(ProtopipeBlogPreviewNavState);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly blockStates = signal<BuildPageBlockState[]>([]);
  readonly profileLabel = signal<string | null>(null);
  readonly varietyKey = signal<string | null>(null);
  readonly hasArticleBody = signal(false);
  readonly postTitle = signal<string>('Blog article');

  readonly siteDesignContext = computed(() =>
    this.buildBook.resolveSiteDesignContext(null, 'blog-post'),
  );

  readonly siteThemeCssVars = computed((): Record<string, string> | null => {
    const ctx = this.siteDesignContext();
    return ctx ? siteThemeTokensToCssVars(ctx.theme) : null;
  });

  readonly subtitle = computed(() => {
    const label = this.profileLabel();
    const variety = this.varietyKey();
    if (label && variety) return `${label} · ${variety}`;
    if (label) return label;
    if (variety) return variety;
    return 'Selected blog template';
  });

  ngOnInit(): void {
    void this.loadPreview();
  }

  onBack(): void {
    this.nav.clear();
    this.exit.emit();
  }

  async retry(): Promise<void> {
    await this.loadPreview();
  }

  private async loadPreview(): Promise<void> {
    const postId = this.contentPostId().trim();
    if (!postId) {
      this.error.set('Missing content post.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      if (!this.strategy.siteId()) {
        await this.strategy.ensureLoaded();
      }
      this.content.reload();
      await this.buildBook.load();

      let post = this.content.postById(postId);
      if (!post) {
        const siteId = this.strategy.siteId();
        const response = await firstValueFrom(this.content.findPost$(postId, siteId));
        post = response.post;
      }
      if (!post) {
        this.error.set('Could not find this article in the content catalog.');
        this.blockStates.set([]);
        return;
      }

      this.applyResolved(post);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load blog preview.';
      this.error.set(message);
      this.blockStates.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private applyResolved(post: ProtopipeContentPost): void {
    this.postTitle.set(this.titleHint()?.trim() || post.title || 'Blog article');
    const resolved = resolveBlogPreviewStack({
      post,
      profiles: this.buildBook.blogTemplateProfiles(),
    });
    this.profileLabel.set(resolved.profileLabel ?? null);
    this.varietyKey.set(resolved.varietyKey ?? null);
    this.hasArticleBody.set(resolved.hasArticleBody);
    this.blockStates.set(resolved.blockStates);
    if (!resolved.blockStates.length) {
      this.error.set('No blog template stack is available for this site yet.');
    }
  }
}
