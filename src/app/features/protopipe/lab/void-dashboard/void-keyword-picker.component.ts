import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type { KeywordIntent } from '../../protopipe.models';
import {
  KEYWORD_PICK_SEARCH_POOL,
  KEYWORD_PICK_SUGGESTED,
  type KeywordPickOption,
} from './void-keyword-picker.mock';

@Component({
  selector: 'app-void-keyword-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './void-keyword-picker.component.html',
  styleUrl: './void-keyword-picker.component.scss',
})
export class VoidKeywordPickerComponent {
  readonly siteLabel = input('destinationweddingpainter.com');
  readonly continued = output<readonly string[]>();

  readonly suggested = KEYWORD_PICK_SUGGESTED;
  readonly searchPool = KEYWORD_PICK_SEARCH_POOL;

  readonly searchQuery = signal('');
  readonly selectedIds = signal<Set<string>>(
    new Set(KEYWORD_PICK_SUGGESTED.filter((k) => k.preselected).map((k) => k.id)),
  );

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly selectedPhrases = computed(() => {
    const ids = this.selectedIds();
    return this.searchPool.filter((k) => ids.has(k.id)).map((k) => k.phrase);
  });

  readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const selected = this.selectedIds();
    const pool = this.searchPool.filter((k) => !selected.has(k.id));
    if (!q) {
      return pool.slice(0, 6);
    }
    return pool.filter((k) => k.phrase.includes(q)).slice(0, 8);
  });

  readonly hasSearchQuery = computed(() => this.searchQuery().trim().length > 0);

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleKeyword(option: KeywordPickOption): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(option.id)) {
        next.delete(option.id);
      } else {
        next.add(option.id);
      }
      return next;
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  formatVolume(n: number): string {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}k`;
    }
    return String(n);
  }

  intentShort(intent: KeywordIntent): string {
    if (intent === 'informational') {
      return 'info';
    }
    if (intent === 'transactional') {
      return 'txn';
    }
    return 'comm';
  }

  continue(): void {
    this.continued.emit(this.selectedPhrases());
  }
}
