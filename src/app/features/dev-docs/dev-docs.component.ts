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
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import {
  DEV_DOC_CATEGORIES,
  DEV_DOCS_CATALOG,
  SESSION_FLOW_CHECKLIST,
  STINGER_CHECKLIST,
  type DevDocCategory,
  type DevDocEntry,
} from './dev-docs-catalog';

@Component({
  selector: 'app-dev-docs',
  standalone: true,
  imports: [FormsModule, RouterLink, Button, IconField, InputIcon, InputText, Tag],
  templateUrl: './dev-docs.component.html',
  styleUrl: './dev-docs.component.scss',
})
export class DevDocsComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  readonly sessionFlowChecklist = SESSION_FLOW_CHECKLIST;
  readonly stingerChecklist = STINGER_CHECKLIST;
  readonly catalog = DEV_DOCS_CATALOG;

  readonly searchQuery = signal('');
  readonly activeCategory = signal<DevDocCategory | 'all'>('all');
  readonly activeBlockId = signal<string | null>('doc-hero');

  readonly categoryNav = [
    { label: 'All', value: 'all' as const },
    ...DEV_DOC_CATEGORIES.map((c) => ({ label: c.label, value: c.id })),
  ];

  readonly filteredDocs = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.activeCategory();

    return this.catalog.filter((doc) => {
      if (cat !== 'all' && doc.category !== cat) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [
        doc.title,
        doc.description,
        doc.category,
        ...(doc.keywords ?? []),
        ...(doc.paragraphs ?? []),
        ...(doc.steps?.map((s) => `${s.title} ${s.body}`) ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly navGroups = computed(() => {
    const groups = new Map<DevDocCategory, DevDocEntry[]>();
    for (const doc of this.filteredDocs()) {
      const list = groups.get(doc.category) ?? [];
      list.push(doc);
      groups.set(doc.category, list);
    }
    return DEV_DOC_CATEGORIES.filter((c) => groups.has(c.id)).map((c) => ({
      category: c,
      docs: groups.get(c.id)!,
    }));
  });

  readonly stats = computed(() => ({
    shown: this.filteredDocs().length,
    total: this.catalog.length,
  }));

  constructor() {
    effect(() => {
      this.filteredDocs();
      queueMicrotask(() => this.bindScrollSpy());
    });
  }

  ngAfterViewInit(): void {
    this.bindScrollSpy();
  }

  setCategory(value: DevDocCategory | 'all'): void {
    this.activeCategory.set(value);
  }

  scrollToBlock(id: string): void {
    const el = this.host.nativeElement.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeBlockId.set(id);
  }

  isNavActive(id: string): boolean {
    return this.activeBlockId() === id;
  }

  async copyText(text: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  }

  private bindScrollSpy(): void {
    this.observer?.disconnect();

    const blocks = this.host.nativeElement.querySelectorAll('[data-doc-id]');
    if (!blocks.length) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target instanceof HTMLElement && top.target.dataset['docId']) {
          this.activeBlockId.set(top.target.dataset['docId']);
        }
      },
      { root: null, rootMargin: '-18% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    );

    Array.from(blocks).forEach((el) => {
      if (el instanceof HTMLElement) {
        this.observer!.observe(el);
      }
    });
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }
}
