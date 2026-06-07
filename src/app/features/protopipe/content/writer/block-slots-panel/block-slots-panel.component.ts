import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProtopipeArticleBlock, ProtopipeContentTemplate } from '@hive/contracts';
import {
  blockKindLabel,
  imagePlaceholderHint,
  isPinnedBlock,
  patchBlock,
  reorderBlocks,
  toggleBlockVisibility,
  visibleBlocks,
} from '../../block-template.util';
import { ProtopipeImagePlaceholderComponent } from '../image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-protopipe-block-slots-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CdkDropList, CdkDrag, ProtopipeImagePlaceholderComponent],
  templateUrl: './block-slots-panel.component.html',
  styleUrl: './block-slots-panel.component.scss',
})
export class ProtopipeBlockSlotsPanelComponent {
  readonly template = input.required<ProtopipeContentTemplate>();
  readonly readOnly = input(false);
  readonly templateChange = output<ProtopipeContentTemplate>();
  readonly focusCanvasSlot = output<string>();
  readonly imageUploadRequest = output<{ blockId: string; imageIndex?: number }>();

  readonly imageHint = imagePlaceholderHint;

  readonly expandedSlotId = signal<string | null>(null);

  readonly slotBlocks = computed(() => {
    const blocks = this.template().blocks ?? [];
    return blocks.filter((b) => !isPinnedBlock(b));
  });

  readonly pinnedBlocks = computed(() => (this.template().blocks ?? []).filter(isPinnedBlock));

  readonly visibleCount = computed(() => visibleBlocks(this.template().blocks ?? []).length);

  kindLabel = blockKindLabel;

  toggleExpand(slotId: string): void {
    this.expandedSlotId.update((current) => (current === slotId ? null : slotId));
  }

  isExpanded(block: ProtopipeArticleBlock): boolean {
    return this.expandedSlotId() === block.slotId;
  }

  emitTemplate(next: ProtopipeContentTemplate): void {
    this.templateChange.emit(next);
  }

  onDrop(event: CdkDragDrop<ProtopipeArticleBlock[]>): void {
    if (this.readOnly() || event.previousIndex === event.currentIndex) return;
    this.emitTemplate(reorderBlocks(this.template(), event.previousIndex, event.currentIndex));
  }

  toggleVisible(block: ProtopipeArticleBlock, event: Event): void {
    event.stopPropagation();
    if (this.readOnly()) return;
    this.emitTemplate(toggleBlockVisibility(this.template(), block.id));
  }

  patch(blockId: string, patch: Partial<ProtopipeArticleBlock>): void {
    if (this.readOnly()) return;
    this.emitTemplate(patchBlock(this.template(), blockId, patch));
  }

  patchProse(block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>, field: 'body' | 'h2', value: string): void {
    if (field === 'body') {
      this.patch(block.id, { body: value });
    } else {
      this.patch(block.id, { h2: value });
    }
  }

  patchCta(block: Extract<ProtopipeArticleBlock, { kind: 'cta' }>, field: 'label' | 'href', value: string): void {
    this.patch(block.id, { [field]: value });
  }

  patchStep(block: Extract<ProtopipeArticleBlock, { kind: 'howto_steps' }>, index: number, field: 'name' | 'body', value: string): void {
    const steps = block.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step));
    this.patch(block.id, { steps });
  }

  addStep(block: Extract<ProtopipeArticleBlock, { kind: 'howto_steps' }>): void {
    this.patch(block.id, { steps: [...block.steps, { name: '', body: '' }] });
  }

  removeStep(block: Extract<ProtopipeArticleBlock, { kind: 'howto_steps' }>, index: number): void {
    this.patch(block.id, { steps: block.steps.filter((_, i) => i !== index) });
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

  addListItem(block: Extract<ProtopipeArticleBlock, { kind: 'list_items' }>): void {
    const rank = block.items.length + 1;
    this.patch(block.id, { items: [...block.items, { rank, title: '', body: '' }] });
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

  addFaqItem(block: Extract<ProtopipeArticleBlock, { kind: 'faq_list' }>): void {
    this.patch(block.id, { items: [...block.items, { question: '', answer: '' }] });
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

  addLink(block: Extract<ProtopipeArticleBlock, { kind: 'internal_links' }>): void {
    this.patch(block.id, { links: [...block.links, { label: '', href: '' }] });
  }

  asProse(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'prose' }> | null {
    return block.kind === 'prose' ? block : null;
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

  asImage(block: ProtopipeArticleBlock): Extract<ProtopipeArticleBlock, { kind: 'image' }> | null {
    return block.kind === 'image' ? block : null;
  }

  patchImageBlock(
    block: Extract<ProtopipeArticleBlock, { kind: 'image' }>,
    field: 'url' | 'alt',
    value: string,
  ): void {
    this.patch(block.id, { [field]: value });
  }

  patchProseImage(
    block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>,
    imageIndex: number,
    field: 'url' | 'alt',
    value: string,
  ): void {
    const images = [...(block.images ?? [])];
    images[imageIndex] = { ...images[imageIndex], [field]: value };
    this.patch(block.id, { images });
  }

  clearImageBlock(block: Extract<ProtopipeArticleBlock, { kind: 'image' }>): void {
    this.patch(block.id, { url: '', alt: '' });
  }

  clearProseImage(
    block: Extract<ProtopipeArticleBlock, { kind: 'prose' }>,
    imageIndex: number,
  ): void {
    const images = [...(block.images ?? [])];
    images[imageIndex] = { ...images[imageIndex], url: '', alt: '' };
    this.patch(block.id, { images });
  }
}
