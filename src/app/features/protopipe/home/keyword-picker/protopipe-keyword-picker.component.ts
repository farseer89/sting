import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  formatCompetitionCell,
  fitLabel,
  sortPlanRows,
  COLUMN_TOOLTIPS,
  type KeywordPlanSortColumn,
  type KeywordPlanSortDirection,
} from './keyword-picker.table';
import {
  formatCompetitionLabel,
  formatKeywordVolume,
  sourceLabel,
} from './keyword-picker.types';
import type { KeywordPickerOption } from './keyword-picker.types';
import { ProtopipeKeywordPickerStore } from './protopipe-keyword-picker.store';

const SLIDER_OPEN_KEY = 'protopipe.home.kwpick.sliderOpen';
const SLIDER_WIDTH_KEY = 'protopipe.home.kwpick.sliderWidthPct';
const SLIDER_WIDTH_DEFAULT = 32;
const SLIDER_WIDTH_MIN = 22;
const SLIDER_WIDTH_MAX = 48;

@Component({
  selector: 'app-protopipe-keyword-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeKeywordPickerStore],
  templateUrl: './protopipe-keyword-picker.component.html',
  styleUrl: './protopipe-keyword-picker.component.scss',
})
export class ProtopipeKeywordPickerComponent implements OnInit {
  readonly store = inject(ProtopipeKeywordPickerStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workspaceEl = viewChild<ElementRef<HTMLElement>>('workspace');

  readonly siteLabel = input('');
  readonly confirmed = output<void>();

  readonly sliderOpen = signal(this.readSliderOpen());
  readonly sliderWidthPct = signal(this.readSliderWidth());
  private dragMoveListener: ((e: PointerEvent) => void) | null = null;
  private dragUpListener: ((e: PointerEvent) => void) | null = null;

  readonly formatVolume = formatKeywordVolume;
  readonly formatCompetition = formatCompetitionLabel;
  readonly sourceLabel = sourceLabel;
  readonly formatCompetitionCell = formatCompetitionCell;
  readonly fitLabel = fitLabel;
  readonly columnTooltips = COLUMN_TOOLTIPS;

  readonly sortColumn = signal<KeywordPlanSortColumn>('opportunity');
  readonly sortDirection = signal<KeywordPlanSortDirection>('desc');

  readonly sortedPlanRows = computed(() =>
    sortPlanRows(this.store.pool(), this.sortColumn(), this.sortDirection()),
  );

  formatOpportunity(option: KeywordPickerOption): string {
    if (option.opportunityScore == null) return '—';
    return option.opportunityScore.toLocaleString();
  }

  sortIndicator(column: KeywordPlanSortColumn): string {
    if (this.sortColumn() !== column) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  toggleSort(column: KeywordPlanSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set(column === 'phrase' ? 'asc' : 'desc');
  }

  onSuggestedRowClick(event: Event, option: KeywordPickerOption): void {
    const target = event.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('.kwpick__th-sort')) return;
    this.toggle(option);
  }

  ngOnInit(): void {
    void this.store.load();
    this.destroyRef.onDestroy(() => {
      if (this.dragMoveListener) {
        window.removeEventListener('pointermove', this.dragMoveListener);
      }
      if (this.dragUpListener) {
        window.removeEventListener('pointerup', this.dragUpListener);
      }
    });
  }

  toggleSlider(): void {
    const next = !this.sliderOpen();
    this.sliderOpen.set(next);
    try {
      localStorage.setItem(SLIDER_OPEN_KEY, next ? '1' : '0');
    } catch {
      /* localStorage unavailable */
    }
  }

  onSplitterPointerDown(event: PointerEvent): void {
    const host = this.workspaceEl()?.nativeElement;
    if (!host) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

    const move = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const railWidth = 32;
      const fromRightPx = rect.right - e.clientX - railWidth;
      const pct = clamp(
        (fromRightPx / Math.max(rect.width - railWidth, 1)) * 100,
        SLIDER_WIDTH_MIN,
        SLIDER_WIDTH_MAX,
      );
      this.sliderWidthPct.set(Math.round(pct));
    };

    const up = () => {
      if (this.dragMoveListener) {
        window.removeEventListener('pointermove', this.dragMoveListener);
      }
      if (this.dragUpListener) {
        window.removeEventListener('pointerup', this.dragUpListener);
      }
      this.dragMoveListener = null;
      this.dragUpListener = null;
      try {
        localStorage.setItem(SLIDER_WIDTH_KEY, String(this.sliderWidthPct()));
      } catch {
        /* localStorage unavailable */
      }
    };

    this.dragMoveListener = move;
    this.dragUpListener = up;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private readSliderOpen(): boolean {
    try {
      const raw = localStorage.getItem(SLIDER_OPEN_KEY);
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  }

  private readSliderWidth(): number {
    try {
      const raw = localStorage.getItem(SLIDER_WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) {
        return clamp(parsed, SLIDER_WIDTH_MIN, SLIDER_WIDTH_MAX);
      }
    } catch {
      /* ignore */
    }
    return SLIDER_WIDTH_DEFAULT;
  }

  onSearchInput(value: string): void {
    this.store.setSearchQuery(value);
  }

  clearSearch(): void {
    this.store.clearSearch();
  }

  toggle(option: KeywordPickerOption): void {
    this.store.toggle(option);
  }

  addFromSearch(option: KeywordPickerOption): void {
    this.store.addFromOption(option);
  }

  addPrimarySearch(): void {
    const primary = this.store.searchPrimary();
    if (primary) {
      this.store.addFromOption(primary);
    }
  }

  addCustomFromSearch(): void {
    const q = this.store.searchQuery().trim();
    if (q) {
      this.store.addCustom(q);
    }
  }

  remove(phraseKey: string): void {
    this.store.remove(phraseKey);
  }

  async confirm(): Promise<void> {
    const ok = await this.store.confirmAndBuildPlan();
    if (ok) {
      this.confirmed.emit();
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
