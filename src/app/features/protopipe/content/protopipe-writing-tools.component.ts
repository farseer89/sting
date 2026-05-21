import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProtopipeKeywordDto } from '@hive/contracts';
import { buildArticleIdeas } from './content-template-suggestions';
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

  readonly session = this.content.writingSession;
  readonly planKeywords = this.content.planKeywords;

  readonly ideas = computed(() => {
    const s = this.session();
    return buildArticleIdeas(this.planKeywords(), s?.selectedKeywordId ?? null);
  });

  readonly imageDragOver = signal(false);

  onIdeaClick(keywordId: string): void {
    const kw = this.planKeywords().find((k) => k.id === keywordId);
    if (kw) this.content.applyKeywordToWriting(kw);
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
