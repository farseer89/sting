import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Editor } from '@tiptap/core';
import type { ProtopipeArticleBlock, ProtopipeContentTemplate } from '@hive/contracts';
import {
  imagePlaceholderHint,
  patchBlock,
  proseBlocksForSections,
  visibleBlocks,
} from '../../block-template.util';
import { ProtopipeImagePlaceholderComponent } from '../image-placeholder/image-placeholder.component';
import { InfographicCompositionPreviewComponent } from '../infographic-composition-preview/infographic-composition-preview.component';
import type { FactHighlightItem } from '../prose-editor/fact-highlight.extension';
import { ProseEditorComponent } from '../prose-editor/prose-editor.component';

export interface ArticleCanvasEditorReady {
  slotId: string;
  sectionIndex: number | null;
  editor: Editor;
}

export interface ArticleCanvasFactClick {
  slotId: string;
  sectionIndex: number | null;
  factId: string;
  rect: DOMRect;
}

@Component({
  selector: 'app-protopipe-article-block-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ProseEditorComponent, ProtopipeImagePlaceholderComponent, InfographicCompositionPreviewComponent],
  templateUrl: './article-block-canvas.component.html',
  styleUrl: './article-block-canvas.component.scss',
})
export class ProtopipeArticleBlockCanvasComponent {
  readonly template = input.required<ProtopipeContentTemplate>();
  readonly readOnly = input(false);
  readonly activeSlotId = input<string | null>(null);
  readonly introFlaggedFacts = input<FactHighlightItem[]>([]);
  readonly sectionFactsByBlockId = input<Record<string, FactHighlightItem[]>>({});
  readonly imageUploading = input(false);
  readonly imageUploadTarget = input<
    | { kind: 'hero'; blockId: string }
    | { kind: 'section'; sectionIndex: number }
    | { kind: 'prose'; blockId: string; imageIndex: number }
    | null
  >(null);

  readonly templateChange = output<ProtopipeContentTemplate>();
  readonly editorReady = output<ArticleCanvasEditorReady>();
  readonly factClick = output<ArticleCanvasFactClick>();
  readonly imageUploadRequest = output<{ blockId: string; imageIndex?: number }>();

  readonly imageHint = imagePlaceholderHint;

  readonly canvasBlocks = computed(() => visibleBlocks(this.template().blocks ?? []));

  readonly sectionIndexByBlockId = computed(() => {
    const map = new Map<string, number>();
    proseBlocksForSections(this.template()).forEach((block, index) => {
      map.set(block.id, index);
    });
    return map;
  });

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  slotAnchorId(slotId: string): string {
    return `abc-slot-${slotId}`;
  }

  scrollToSlot(slotId: string): void {
    const el = this.host.nativeElement.querySelector<HTMLElement>(`#${this.slotAnchorId(slotId)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  sectionIndexFor(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>): number | null {
    if (block.slotId === 'intro') return null;
    return this.sectionIndexByBlockId().get(block.id) ?? null;
  }

  isActive(slotId: string): boolean {
    return this.activeSlotId() === slotId;
  }

  isHeroUploading(blockId: string): boolean {
    const target = this.imageUploadTarget();
    return this.imageUploading() && target?.kind === 'hero' && target.blockId === blockId;
  }

  isProseImageUploading(blockId: string, imageIndex: number): boolean {
    const target = this.imageUploadTarget();
    return (
      this.imageUploading() &&
      target?.kind === 'prose' &&
      target.blockId === blockId &&
      target.imageIndex === imageIndex
    );
  }

  factsForProse(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>): FactHighlightItem[] {
    if (block.slotId === 'intro') return this.introFlaggedFacts();
    return this.sectionFactsByBlockId()[block.id] ?? [];
  }

  emitTemplate(next: ProtopipeContentTemplate): void {
    this.templateChange.emit(next);
  }

  patchHeadline(value: string): void {
    if (this.readOnly()) return;
    this.emitTemplate({ ...this.template(), h1: value });
  }

  patch(blockId: string, patch: Partial<ProtopipeArticleBlock>): void {
    if (this.readOnly()) return;
    this.emitTemplate(patchBlock(this.template(), blockId, patch));
  }

  patchProse(
    block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>,
    field: 'body' | 'h2',
    value: string,
  ): void {
    this.patch(block.id, field === 'body' ? { body: value } : { h2: value });
  }

  patchImageBlock(
    block: Extract<ProtopipeArticleBlock, { kind: 'image' }>,
    field: 'url' | 'alt' | 'align',
    value: string,
  ): void {
    this.patch(block.id, { [field]: value });
  }

  patchProseImage(
    block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>,
    imageIndex: number,
    field: 'url' | 'alt' | 'align',
    value: string,
  ): void {
    const images = [...(block.images ?? [])];
    images[imageIndex] = { ...images[imageIndex], [field]: value };
    this.patch(block.id, { images });
  }

  clearImageBlock(block: Extract<ProtopipeArticleBlock, { kind: 'image' }>): void {
    this.patch(block.id, { url: '', alt: '' });
  }

  clearProseImage(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>, imageIndex: number): void {
    const images = [...(block.images ?? [])];
    images[imageIndex] = { ...images[imageIndex], url: '', alt: '' };
    this.patch(block.id, { images });
  }

  patchInfographic(
    block: Extract<ProtopipeArticleBlock, { kind: 'infographic' }>,
    field: 'url' | 'alt' | 'caption',
    value: string,
  ): void {
    this.patch(block.id, { [field]: value });
  }

  patchStep(
    block: Extract<ProtopipeArticleBlock, { kind: 'howto_steps' }>,
    index: number,
    field: 'name' | 'body',
    value: string,
  ): void {
    const steps = block.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step));
    this.patch(block.id, { steps });
  }

  patchListItem(
    block: Extract<ProtopipeArticleBlock, { kind: 'list_items' }>,
    index: number,
    field: 'title' | 'body',
    value: string,
  ): void {
    const items = block.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    this.patch(block.id, { items });
  }

  patchFaqItem(
    block: Extract<ProtopipeArticleBlock, { kind: 'faq_list' }>,
    index: number,
    field: 'question' | 'answer',
    value: string,
  ): void {
    const items = block.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    this.patch(block.id, { items });
  }

  patchLink(
    block: Extract<ProtopipeArticleBlock, { kind: 'internal_links' }>,
    index: number,
    field: 'label' | 'href',
    value: string,
  ): void {
    const links = block.links.map((link, i) => (i === index ? { ...link, [field]: value } : link));
    this.patch(block.id, { links });
  }

  patchCta(block: Extract<ProtopipeArticleBlock, { kind: 'cta' }>, field: 'label' | 'href', value: string): void {
    this.patch(block.id, { [field]: value });
  }

  patchAuthor(block: Extract<ProtopipeArticleBlock, { kind: 'author_line' }>, value: string): void {
    this.patch(block.id, { text: value });
  }

  onEditorReady(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>, editor: Editor): void {
    this.editorReady.emit({
      slotId: block.slotId,
      sectionIndex: this.sectionIndexFor(block),
      editor,
    });
  }

  onFactClick(
    block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>,
    event: { factId: string; rect: DOMRect },
  ): void {
    this.factClick.emit({
      slotId: block.slotId,
      sectionIndex: this.sectionIndexFor(block),
      ...event,
    });
  }

  asProse(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'prose' }> | null {
    return block.kind === 'prose' ? block : null;
  }

  asImage(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'image' }> | null {
    return block.kind === 'image' ? block : null;
  }

  asHowto(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'howto_steps' }> | null {
    return block.kind === 'howto_steps' ? block : null;
  }

  asList(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'list_items' }> | null {
    return block.kind === 'list_items' ? block : null;
  }

  asFaq(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'faq_list' }> | null {
    return block.kind === 'faq_list' ? block : null;
  }

  asLinks(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'internal_links' }> | null {
    return block.kind === 'internal_links' ? block : null;
  }

  asCta(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'cta' }> | null {
    return block.kind === 'cta' ? block : null;
  }

  asAuthor(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'author_line' }> | null {
    return block.kind === 'author_line' ? block : null;
  }

  asInfographic(
    block: ProtopipeArticleBlock,
  ): Extract<ProtopipeArticleBlock, { kind: 'infographic' }> | null {
    return block.kind === 'infographic' ? block : null;
  }

  prosePresentation(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>): string {
    return block.presentation ?? 'prose';
  }

  firstProseImage(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>) {
    return block.images?.[0] ?? null;
  }

  requestProseImageUpload(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>, imageIndex = 0): void {
    this.imageUploadRequest.emit({ blockId: block.id, imageIndex });
  }
}
