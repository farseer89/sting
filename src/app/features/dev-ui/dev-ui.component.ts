import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import {
  DEV_UI_CATALOG,
  DEV_UI_CATEGORIES,
  DEV_UI_WORKFLOW_STEPS,
  type DevUiCategory,
  type DevUiExample,
} from './dev-ui-catalog';
import { DevUiPreviewComponent } from './dev-ui-preview.component';
import { UI_PATTERNS, type UiPattern } from './dev-ui-patterns-catalog';
import { DevUiPatternPreviewComponent } from './dev-ui-pattern-preview.component';

type ViewFilter = 'all' | 'live';
type StudioMode = 'components' | 'patterns';

@Component({
  selector: 'app-dev-ui',
  standalone: true,
  imports: [
    FormsModule,
    Button,
    IconField,
    InputIcon,
    InputText,
    SelectButton,
    Tag,
    ToggleSwitch,
    Tooltip,
    DevUiPreviewComponent,
    DevUiPatternPreviewComponent,
  ],
  templateUrl: './dev-ui.component.html',
  styleUrl: './dev-ui.component.scss',
})
export class DevUiComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  readonly workflowSteps = DEV_UI_WORKFLOW_STEPS;
  readonly catalog = DEV_UI_CATALOG;
  readonly patterns = UI_PATTERNS;

  readonly studioMode = signal<StudioMode>('components');
  readonly searchQuery = signal('');
  readonly activeCategory = signal<DevUiCategory | 'all'>('all');
  readonly viewFilter = signal<ViewFilter>('all');
  readonly showAllCode = signal(false);
  readonly openCodeIds = signal<Set<string>>(new Set());
  readonly activeBlockId = signal<string | null>(null);
  readonly copiedId = signal<string | null>(null);

  readonly studioModeOptions = [
    { label: 'Components', value: 'components' as const },
    { label: 'Style patterns', value: 'patterns' as const },
  ];

  readonly viewFilterOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Live only', value: 'live' as const },
  ];

  readonly categoryNav = [
    { label: 'All', value: 'all' as const },
    ...DEV_UI_CATEGORIES.map((c) => ({ label: c.label, value: c.id })),
  ];

  readonly filteredExamples = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.activeCategory();
    const liveOnly = this.viewFilter() === 'live';

    return this.catalog.filter((ex) => {
      if (cat !== 'all' && ex.category !== cat) {
        return false;
      }
      if (liveOnly && !ex.demoKey) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [ex.name, ex.module, ex.description, ex.category, ...(ex.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly navGroups = computed(() => {
    const groups = new Map<DevUiCategory, DevUiExample[]>();
    for (const ex of this.filteredExamples()) {
      const list = groups.get(ex.category) ?? [];
      list.push(ex);
      groups.set(ex.category, list);
    }
    return DEV_UI_CATEGORIES.filter((c) => groups.has(c.id)).map((c) => ({
      category: c,
      examples: groups.get(c.id)!,
    }));
  });

  readonly groupedBlocks = computed(() => this.navGroups());

  readonly filteredPatterns = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return this.patterns;
    }
    return this.patterns.filter((p) => {
      const haystack = [p.name, p.description, p.rootClass, ...(p.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly stats = computed(() => {
    if (this.studioMode() === 'patterns') {
      return {
        shown: this.filteredPatterns().length,
        total: this.patterns.length,
        live: this.patterns.length,
      };
    }
    return {
      shown: this.filteredExamples().length,
      total: this.catalog.length,
      live: this.catalog.filter((e) => e.demoKey).length,
    };
  });

  readonly isPatternsMode = computed(() => this.studioMode() === 'patterns');

  constructor() {
    effect(() => {
      this.filteredExamples();
      this.filteredPatterns();
      this.studioMode();
      queueMicrotask(() => this.bindScrollSpy());
    });
  }

  ngAfterViewInit(): void {
    this.bindScrollSpy();
  }

  setCategory(value: DevUiCategory | 'all'): void {
    this.activeCategory.set(value);
  }

  isCodeVisible(id: string): boolean {
    return this.showAllCode() || this.openCodeIds().has(id);
  }

  toggleCode(id: string): void {
    this.openCodeIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  scrollToBlock(id: string): void {
    const el = this.host.nativeElement.querySelector(`#block-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeBlockId.set(id);
  }

  isNavActive(id: string): boolean {
    return this.activeBlockId() === id;
  }

  setStudioMode(mode: StudioMode): void {
    this.studioMode.set(mode);
    this.activeCategory.set('all');
    this.activeBlockId.set(mode === 'patterns' ? this.patterns[0]?.id ?? null : null);
  }

  async copySnippet(text: string, id: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      this.copiedId.set(id);
      setTimeout(() => {
        if (this.copiedId() === id) {
          this.copiedId.set(null);
        }
      }, 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async copySnippetExample(ex: DevUiExample, event: Event): Promise<void> {
    await this.copySnippet(ex.snippet, ex.id, event);
  }

  async copyPatternSnippet(pattern: UiPattern, event: Event): Promise<void> {
    await this.copySnippet(pattern.snippet, pattern.id, event);
  }

  async copyRootClass(pattern: UiPattern, event: Event): Promise<void> {
    await this.copySnippet(pattern.rootClass, `${pattern.id}-class`, event);
  }

  docUrl(ex: DevUiExample): string {
    return ex.category === 'hive'
      ? 'https://github.com/farseer89/hive-contracts'
      : `https://primeng.org/${ex.module}`;
  }

  private bindScrollSpy(): void {
    this.observer?.disconnect();

    const blocks = this.host.nativeElement.querySelectorAll('[data-block-id]');
    if (!blocks.length) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target instanceof HTMLElement && top.target.dataset['blockId']) {
          this.activeBlockId.set(top.target.dataset['blockId']);
        }
      },
      { root: null, rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    );

    Array.from(blocks).forEach((el) => {
      if (el instanceof HTMLElement) {
        this.observer!.observe(el);
      }
    });
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }
}
