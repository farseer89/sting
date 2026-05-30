import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ArticleIdeaDto, ProtopipeKeywordDto } from '@hive/contracts';
import { ProtopipeAgentService } from '../protopipe-agent.service';
import { ProtopipeContentService } from '../protopipe-content.service';

@Component({
  selector: 'app-protopipe-writing-tools',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CdkDropList, CdkDrag],
  templateUrl: './protopipe-writing-tools.component.html',
  styleUrl: './protopipe-writing-tools.component.scss',
})
export class ProtopipeWritingToolsComponent {
  protected readonly content = inject(ProtopipeContentService);
  protected readonly agent = inject(ProtopipeAgentService);

  readonly session = this.content.writingSession;
  readonly planKeywords = this.content.planKeywords;

  /** Pre-writing research brief (when the post was seeded from a content plan). */
  readonly brief = computed(() => this.session()?.brief ?? null);
  readonly hasBrief = computed(() => {
    const b = this.brief();
    if (!b) return false;
    return Boolean(
      b.mustCoverTerms.length ||
        b.contentGaps.length ||
        b.secondaryKeywords.length ||
        b.competitorHeadings.length ||
        b.targetWordCount ||
        b.positioningSummary ||
        b.recommendedAngle,
    );
  });

  readonly ideas = this.agent.ideas;
  readonly ideasLoading = this.agent.ideasLoading;
  readonly ideasPending = this.agent.ideasPending;
  readonly ideasError = this.agent.ideasError;

  readonly imageDragOver = signal(false);

  private readonly ideasBootstrapped = signal(false);

  constructor() {
    effect(() => {
      if (!this.content.catalogReady() || !this.content.inWritingMode()) return;
      if (this.ideasBootstrapped()) return;
      untracked(() => {
        this.ideasBootstrapped.set(true);
        void this.agent.loadArticleIdeas();
      });
    });
  }

  readonly visibleIdeas = computed(() => {
    const s = this.session();
    const selected = s?.selectedKeywordId ?? null;
    return this.ideas().filter((i) => i.keywordId !== selected);
  });

  onIdeaClick(idea: ArticleIdeaDto): void {
    this.content.applyArticleIdeaDto(idea);
  }

  refreshIdeas(): void {
    void this.agent.refreshArticleIdeas();
  }

  buildOutline(): void {
    const s = this.session();
    if (!s || s.readOnly) return;

    const kw = this.planKeywords().find((k) => k.id === s.selectedKeywordId);
    if (kw) {
      this.content.applyKeywordToWriting(kw);
      return;
    }

    const headings = [
      'Introduction',
      'What couples should know',
      'How it works',
      'Next steps',
    ];
    const template = s.template;
    const sections = headings.map((h2, i) => ({
      h2,
      body: template.sections[i]?.body ?? '',
      images: template.sections[i]?.images ?? [],
    }));
    this.content.updateWritingSession({ template: { ...template, sections } });
  }

  onOutlineDrop(event: CdkDragDrop<string[]>): void {
    this.content.reorderWritingSections(event.previousIndex, event.currentIndex);
  }

  focusSection(index: number): void {
    this.content.setFocusedSection(index);
    document.getElementById(`doc-section-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSectionDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    this.content.setFocusedSection(index);
  }

  onSectionDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      this.attachImageFile(file, index);
    }
  }

  onImagePoolDrop(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    const s = this.session();
    if (file?.type.startsWith('image/') && s) {
      this.attachImageFile(file, s.focusedSectionIndex);
    }
  }

  onImagePoolDragOver(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver.set(true);
  }

  onImagePoolDragLeave(): void {
    this.imageDragOver.set(false);
  }

  private attachImageFile(file: File, sectionIndex: number): void {
    const url = URL.createObjectURL(file);
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    this.content.addImageToWritingSection(sectionIndex, url, alt);
  }

  removeImage(sectionIndex: number, imageIndex: number): void {
    const s = this.session();
    if (!s || s.readOnly) return;
    const section = s.template.sections[sectionIndex];
    const images = (section.images ?? []).filter((_, i) => i !== imageIndex);
    this.content.patchWritingSection(sectionIndex, { images });
  }

  selectedKeyword(): ProtopipeKeywordDto | undefined {
    const s = this.session();
    return this.planKeywords().find((k) => k.id === s?.selectedKeywordId);
  }

  outlineHeadings(): string[] {
    const s = this.session();
    return s?.template.sections.map((sec, i) => sec.h2?.trim() || `Section ${i + 1}`) ?? [];
  }
}
