import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProtopipeContentImageAlign } from '@hive/contracts';

/** insert = canvas inline slot (subtle); detail = layout inspector panel */
export type ImagePlaceholderMode = 'insert' | 'detail';

export type { ProtopipeContentImageAlign as ImageAlign };

interface AlignOption {
  id: ProtopipeContentImageAlign;
  label: string;
  short: string;
}

const INLINE_ALIGN_OPTIONS: AlignOption[] = [
  { id: 'full', label: 'Full width', short: 'Full' },
  { id: 'left', label: 'Float left', short: 'Left' },
  { id: 'right', label: 'Float right', short: 'Right' },
  { id: 'center', label: 'Center', short: 'Center' },
];

@Component({
  selector: 'app-protopipe-image-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './image-placeholder.component.html',
  styleUrl: './image-placeholder.component.scss',
})
export class ProtopipeImagePlaceholderComponent {
  readonly label = input('Image');
  readonly hint = input('Upload an image or add a URL');
  readonly url = input('');
  readonly alt = input('');
  readonly align = input<ProtopipeContentImageAlign>('full');
  readonly readOnly = input(false);
  readonly uploading = input(false);
  readonly hero = input(false);
  /** @deprecated Use mode="insert" — kept for layout spacing hooks */
  readonly compact = input(false);
  readonly mode = input<ImagePlaceholderMode>('insert');

  readonly urlChange = output<string>();
  readonly altChange = output<string>();
  readonly alignChange = output<ProtopipeContentImageAlign>();
  readonly upload = output<void>();
  readonly remove = output<void>();

  readonly urlFieldOpen = signal(false);
  readonly altFieldOpen = signal(false);

  readonly isInsertMode = computed(() => this.mode() === 'insert');

  readonly alignOptions = computed(() =>
    this.hero() ? INLINE_ALIGN_OPTIONS.filter((o) => o.id === 'full') : INLINE_ALIGN_OPTIONS,
  );

  readonly figureAlignClass = computed(() => `img-ph__figure--align-${this.align() || 'full'}`);

  constructor() {
    effect(() => {
      if (this.url()?.trim() && !this.alt()?.trim()) {
        this.altFieldOpen.set(true);
      }
    });
  }

  hasPreview(): boolean {
    return Boolean(this.url()?.trim());
  }

  needsAlt(): boolean {
    return Boolean(this.url()?.trim() && !this.alt()?.trim());
  }

  selectAlign(next: ProtopipeContentImageAlign): void {
    if (this.readOnly() || this.align() === next) return;
    this.alignChange.emit(next);
  }

  openUrlField(): void {
    this.urlFieldOpen.set(true);
  }

  openAltField(): void {
    this.altFieldOpen.set(true);
  }

  onRemove(): void {
    this.urlFieldOpen.set(false);
    this.altFieldOpen.set(false);
    this.remove.emit();
  }
}
