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
import type { BlogArticlePackagePreview } from '../../build-book/build-book-blog-template.catalog';
import type { BlogArticleTemplateKey } from '../../build-book/build-book.types';
import { ProtopipeBuildBookService } from '../../build-book/protopipe-build-book.service';
import {
  ProtopipeBuildPageCanvasComponent,
  type BuildPageBlockState,
} from '../../build-book/canvas/build-page-canvas.component';
import { ProtopipeContentService } from '../../protopipe-content.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { siteThemeTokensToCssVars } from '../../site-design/site-theme.util';
import { ProtopipeBlogPreviewNavState } from '../protopipe-blog-preview-nav.state';
import {
  blogArticleTemplatePreviewTitle,
  resolveBlogPreviewStack,
  resolveBlogArticleTemplatePreviewStack,
} from './resolve-blog-preview-stack.util';

@Component({
  selector: 'app-protopipe-home-blog-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildPageCanvasComponent],
  templateUrl: './protopipe-home-blog-preview.component.html',
  styleUrl: './protopipe-home-blog-preview.component.scss',
})
export class ProtopipeHomeBlogPreviewComponent implements OnInit {
  readonly contentPostId = input<string | null | undefined>(undefined);
  readonly articleTemplateKey = input<BlogArticleTemplateKey | null>(null);
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
  readonly templateLabel = signal<string | null>(null);
  readonly varietyKey = signal<string | null>(null);
  readonly articlePackage = signal<BlogArticlePackagePreview | null>(null);
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
    const articleTemplate = this.templateLabel();
    const label = this.profileLabel();
    const variety = this.varietyKey();
    const stack =
      articleTemplate ||
      (label && variety ? `${label} · legacy · ${variety}` : null) ||
      label ||
      (variety ? `legacy · ${variety}` : null) ||
      'Selected blog template';
    return `${stack} · Layout mock — live publish uses the Writer article (portable markdown)`;
  });

  readonly packageMetaLength = computed(() => {
    const meta = this.articlePackage()?.metaDescription?.trim() ?? '';
    return meta.length;
  });

  readonly packageUrl = computed(() => {
    const slug = this.articlePackage()?.slug?.trim();
    return slug ? `/blog/${slug}` : null;
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
    const templateKey = this.articleTemplateKey();
    if (templateKey) {
      await this.loadArticleTemplatePreview(templateKey);
      return;
    }

    const postId = this.contentPostId()?.trim() ?? '';
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
      if (!this.buildBook.hasDraft()) {
        await this.buildBook.initializeStarterDraft();
      }
      this.buildBook.ensureBlogTemplateProfiles();

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

  private async loadArticleTemplatePreview(templateKey: BlogArticleTemplateKey): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (!this.strategy.siteId()) {
        await this.strategy.ensureLoaded();
      }
      await this.buildBook.load();
      if (!this.buildBook.hasDraft()) {
        await this.buildBook.initializeStarterDraft();
      }
      const resolved = resolveBlogArticleTemplatePreviewStack(templateKey);
      this.postTitle.set(this.titleHint()?.trim() || blogArticleTemplatePreviewTitle(templateKey));
      this.templateLabel.set(resolved.templateLabel ?? null);
      this.profileLabel.set(null);
      this.varietyKey.set(null);
      this.articlePackage.set(resolved.articlePackage ?? null);
      this.hasArticleBody.set(true);
      this.blockStates.set(resolved.blockStates);
      if (!resolved.blockStates.length) {
        this.error.set('Could not build this blog template design preview.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load blog template preview.';
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
      blogPages: this.buildBook.blogPosts(),
    });
    this.profileLabel.set(resolved.profileLabel ?? null);
    this.templateLabel.set(resolved.templateLabel ?? null);
    this.varietyKey.set(resolved.varietyKey ?? null);
    this.articlePackage.set(null);
    this.hasArticleBody.set(resolved.hasArticleBody);
    this.blockStates.set(resolved.blockStates);
    if (!resolved.blockStates.length) {
      this.error.set('Could not build a blog template stack for preview.');
    }
  }
}
