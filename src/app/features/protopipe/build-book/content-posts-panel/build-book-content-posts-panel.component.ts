import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import type { ProtopipeContentPlanCalendarItem } from '@hive/contracts';
import { ContentPlanStore } from '../../content-plan/content-plan.store';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import type { BuildBookPage } from '../build-book.types';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';
import { parseProtopipeApiError } from '../../protopipe-http.util';

function calendarItemKey(item: ProtopipeContentPlanCalendarItem): string {
  return `${item.proposedPublishAt ?? 'backlog'}|${item.workingTitle}`;
}

function formatPublishDate(iso: string | null | undefined): string {
  if (!iso) return 'Backlog';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Backlog';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || 'draft-post'
  );
}

@Component({
  selector: 'app-build-book-content-posts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './build-book-content-posts-panel.component.html',
  styleUrl: './build-book-content-posts-panel.component.scss',
})
export class BuildBookContentPostsPanelComponent implements OnInit {
  readonly buildBook = inject(ProtopipeBuildBookService);
  private readonly contentPlan = inject(ContentPlanStore);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly api = inject(ProtopipeApiService);
  private readonly router = inject(Router);

  readonly selectedPageId = input<string | null>(null);
  readonly selectedPageIdChange = output<string | null>();
  /** Emitted when the active blog profile stack is reset to the default template. */
  readonly profileReset = output<string>();

  readonly newPageLabel = signal('Custom template');
  readonly addingPlanKey = signal<string | null>(null);
  readonly creatingDraft = signal(false);
  readonly planError = signal<string | null>(null);

  readonly plan = this.contentPlan.plan;
  readonly planLoading = this.contentPlan.loading;
  readonly planComplete = this.contentPlan.isComplete;

  readonly calendarItems = computed(() => this.plan()?.calendar ?? []);

  constructor() {
    effect(() => {
      const siteId = this.strategy.siteId();
      if (!siteId) return;
      this.contentPlan.setSiteId(siteId);
      void this.contentPlan.loadLatest();
    });
  }

  pages(): BuildBookPage[] {
    return this.buildBook.blogArticlePages();
  }

  templateProfiles(): BuildBookPage[] {
    const pages = this.buildBook.blogTemplateProfiles();
    const approved = pages.filter((page) => page.templateProfileMeta?.articleTemplateKey);
    const legacy = pages.filter((page) => !page.templateProfileMeta?.articleTemplateKey);
    return [...approved, ...legacy];
  }

  ngOnInit(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.contentPlan.setSiteId(siteId);
    void this.contentPlan.loadLatest();
    this.buildBook.ensureBlogTemplateProfiles();
  }

  selectPage(pageId: string): void {
    this.selectedPageIdChange.emit(pageId);
  }

  resetSelectedToDefaultTemplate(): void {
    const id = this.selectedPageId();
    if (!id) return;
    const page = this.buildBook.resetBlogPostToDefaultTemplate(id);
    if (page) {
      this.selectedPageIdChange.emit(page.id);
      this.profileReset.emit(page.id);
    }
  }

  createPage(): void {
    const page = this.buildBook.createBlogPostPage(this.newPageLabel(), {
      role: 'template-profile',
      preferredId: 'answer-guide-custom',
      templateProfileMeta: { articleTemplateKey: 'answer-guide' },
      seedSlots: [
        { patternId: 'section-intro', preferredBlockId: 'universal-intro-centered' },
        { patternId: 'quick-answer', preferredBlockId: 'universal-quick-answer' },
        { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
        { patternId: 'related-links', preferredBlockId: 'universal-related-links' },
        { patternId: 'cta-banner', preferredBlockId: 'universal-cta-band' },
      ],
    });
    if (page) {
      this.selectedPageIdChange.emit(page.id);
      this.newPageLabel.set('Custom template');
    }
  }

  /** Blank portable ContentTemplate draft + linked blog-post article page. */
  async createPortableDraft(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    const title = this.newPageLabel().trim() || 'Draft post';
    this.creatingDraft.set(true);
    this.planError.set(null);
    try {
      const created = await this.api.createContent(siteId, {
        title,
        slug: slugifyTitle(title),
        status: 'draft',
        description: `${title} — draft post.`,
        bodyMarkdown: `Draft for “${title}”. Generate the article from the writer.`,
      });
      const contentPostId = created.post?.id;
      const page = this.buildBook.createBlogPostPage(title, {
        contentPostId,
        role: 'article',
      });
      if (page) {
        this.selectedPageIdChange.emit(page.id);
        this.newPageLabel.set('Custom template');
      }
      if (contentPostId) {
        this.openWriter(contentPostId);
      }
    } catch (err) {
      this.planError.set(parseProtopipeApiError(err, 'Could not create a portable draft post.'));
    } finally {
      this.creatingDraft.set(false);
    }
  }

  pageForPlanItem(item: ProtopipeContentPlanCalendarItem): BuildBookPage | null {
    return this.buildBook.findBlogPostByPlanItemKey(calendarItemKey(item));
  }

  itemKey(item: ProtopipeContentPlanCalendarItem): string {
    return calendarItemKey(item);
  }

  isAddingItem(item: ProtopipeContentPlanCalendarItem): boolean {
    return this.addingPlanKey() === calendarItemKey(item);
  }

  planItemTitle(item: ProtopipeContentPlanCalendarItem): string {
    return item.workingTitle?.trim() || item.suggestedKeyword || 'Untitled';
  }

  planItemMeta(item: ProtopipeContentPlanCalendarItem): string {
    const parts = [
      formatPublishDate(item.proposedPublishAt),
      item.suggestedKeyword,
      item.clusterName,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  openWriter(contentPostId: string): void {
    const siteId = this.strategy.siteId();
    if (!siteId || !contentPostId) return;
    void this.router.navigate(['/protopipe/content', contentPostId], {
      queryParams: { siteId },
    });
  }

  selectedPage(): BuildBookPage | null {
    const id = this.selectedPageId();
    if (!id) return null;
    return this.pages().find((p) => p.id === id) ?? null;
  }

  async addFromPlan(item: ProtopipeContentPlanCalendarItem): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    const itemKey = calendarItemKey(item);
    const existing = this.buildBook.findBlogPostByPlanItemKey(itemKey);
    if (existing) {
      this.selectedPageIdChange.emit(existing.id);
      return;
    }

    this.addingPlanKey.set(itemKey);
    this.planError.set(null);
    try {
      let contentPostId = item.contentPostId;
      if (!contentPostId && item.proposedPublishAt) {
        const confirmed = await this.contentPlan.confirmCalendarItem({
          proposedPublishAt: item.proposedPublishAt,
          workingTitle: item.workingTitle,
        });
        contentPostId = confirmed?.contentPostId ?? contentPostId;
      }

      const title = this.planItemTitle(item);
      if (!contentPostId) {
        const created = await this.api.createContent(siteId, {
          title,
          slug: slugifyTitle(title),
          status: 'draft',
          publishAt: item.proposedPublishAt ?? undefined,
          description:
            item.rationale?.trim().slice(0, 300) ||
            `${title} — draft from the content plan.`,
          bodyMarkdown: [
            item.keyQuestionToAnswer ? `Key question: ${item.keyQuestionToAnswer}` : null,
            item.rationale,
            `Draft for “${title}”. Generate the article from the writer.`,
          ]
            .filter(Boolean)
            .join('\n\n'),
          ...(item.suggestedKeyword
            ? ({ suggestedKeyword: item.suggestedKeyword } as { suggestedKeyword: string })
            : {}),
        });
        contentPostId = created.post?.id;
      }

      if (!contentPostId) {
        throw new Error('Content post was not created for this plan item.');
      }

      const page = this.buildBook.createBlogPostPage(title, {
        contentPostId,
        contentPlanItemKey: itemKey,
        suggestedKeyword: item.suggestedKeyword,
        role: 'article',
      });
      if (page) {
        this.selectedPageIdChange.emit(page.id);
      }
    } catch (err) {
      const fromConfirm = this.contentPlan.error();
      this.planError.set(
        fromConfirm ||
          parseProtopipeApiError(err, 'Could not add this plan item as a blog page.'),
      );
    } finally {
      this.addingPlanKey.set(null);
    }
  }
}
