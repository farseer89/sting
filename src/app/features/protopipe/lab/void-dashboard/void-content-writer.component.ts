import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  buildKeywordSuggestions,
  serpPreview,
  writingHints,
} from '../../content/content-template-suggestions';
import {
  PROTOPIPE_CONTENT_META_MAX,
  PROTOPIPE_CONTENT_META_MIN,
} from '../../protopipe.constants';
import {
  activeAiSuggestions,
  VOID_WRITER_SUGGESTIONS,
  type AiSuggestion,
} from './void-writer-suggestions';

export type SectionBlockType = 'text' | 'heading' | 'image' | 'quote' | 'faq' | 'list';

export interface WriterSection {
  h2: string;
  body: string;
  type: SectionBlockType;
}

export interface SectionInsertOption {
  id: SectionBlockType;
  label: string;
  icon: string;
}

type WriterToolId =
  | 'text'
  | 'heading'
  | 'section'
  | 'image'
  | 'link'
  | 'ai'
  | 'serp'
  | 'hints'
  | 'seo';

interface WriterTool {
  id: WriterToolId;
  label: string;
  group: 'write' | 'inspect';
}

const SECTION_DEFAULTS: Record<SectionBlockType, Pick<WriterSection, 'h2' | 'body'>> = {
  text: { h2: '', body: '' },
  heading: { h2: '', body: '' },
  image: { h2: 'Image', body: '' },
  quote: { h2: '', body: '' },
  faq: { h2: 'FAQ', body: '' },
  list: { h2: '', body: '' },
};

@Component({
  selector: 'app-void-content-writer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './void-content-writer.component.html',
  styleUrl: './void-content-writer.component.scss',
})
export class VoidContentWriterComponent {
  readonly metaMin = PROTOPIPE_CONTENT_META_MIN;
  readonly metaMax = PROTOPIPE_CONTENT_META_MAX;

  readonly primaryKeyword = 'how much does a wedding painter cost';
  readonly seoOpen = signal(true);
  readonly dirty = signal(true);
  readonly scheduleLabel = signal('Jun 4 · 9:00 AM');
  readonly activeTool = signal<WriterToolId>('text');
  readonly showSerp = signal(true);
  readonly showHints = signal(true);
  readonly showSeoPanel = signal(true);
  readonly showAiNotes = signal(true);
  readonly expandedNoteId = signal<string | null>(null);
  readonly openFanAt = signal<number | null>(null);
  private readonly dismissedNoteIds = signal<ReadonlySet<string>>(new Set());

  readonly sectionInsertOptions: SectionInsertOption[] = [
    { id: 'text', label: 'Text', icon: '¶' },
    { id: 'heading', label: 'Heading', icon: 'H' },
    { id: 'list', label: 'List', icon: '≡' },
    { id: 'quote', label: 'Quote', icon: '❝' },
    { id: 'image', label: 'Image', icon: '▣' },
    { id: 'faq', label: 'FAQ', icon: '?' },
  ];

  readonly tools: WriterTool[] = [
    { id: 'text', label: 'Text', group: 'write' },
    { id: 'heading', label: 'Heading', group: 'write' },
    { id: 'section', label: 'Section', group: 'write' },
    { id: 'image', label: 'Image', group: 'write' },
    { id: 'link', label: 'Link', group: 'write' },
    { id: 'ai', label: 'AI notes', group: 'write' },
    { id: 'serp', label: 'Preview', group: 'inspect' },
    { id: 'hints', label: 'Hints', group: 'inspect' },
    { id: 'seo', label: 'SEO', group: 'inspect' },
  ];

  private readonly suggestions = buildKeywordSuggestions({
    id: 'kw-cost',
    phrase: this.primaryKeyword,
    intent: 'informational',
    priority: 'medium',
    notes: 'FAQ / pricing guide article',
  });

  readonly browserTitle = signal(this.suggestions.title);
  readonly h1 = signal(this.suggestions.h1);
  readonly intro = signal(
    'Couples searching for how much does a wedding painter cost want clarity on process, timeline, and what makes the experience special. This guide walks through typical pricing ranges and what affects your quote.',
  );
  readonly metaDescription = signal(this.suggestions.metaDescription);
  readonly slug = signal('how-much-does-a-wedding-painter-cost');
  readonly sections = signal<WriterSection[]>([
    {
      type: 'text',
      h2: 'What is how much does a wedding painter cost?',
      body:
        'Live wedding painting is a premium add-on where an artist paints your ceremony or reception on canvas. Pricing reflects travel, time on-site, canvas size, and whether the painter works internationally.',
    },
    {
      type: 'text',
      h2: 'How the process works',
      body:
        'Most destination painters quote a flat fee that includes consultation, the wedding day, and finishing work in the studio. Deposits typically secure your date six to twelve months out.',
    },
    { type: 'text', h2: 'Why couples book early', body: '' },
    { type: 'text', h2: 'Questions to ask before you commit', body: '' },
  ]);

  readonly introSuggestion = computed(() =>
    this.intro().trim() ? null : this.suggestions.intro,
  );

  private readonly suggestionContext = computed(() => ({
    intro: this.intro(),
    h1: this.h1(),
    sections: this.sections(),
  }));

  readonly aiNotes = computed(() =>
    activeAiSuggestions(
      VOID_WRITER_SUGGESTIONS,
      this.suggestionContext(),
      this.dismissedNoteIds(),
    ),
  );

  readonly aiNoteCount = computed(() => this.aiNotes().length);

  readonly templateSnapshot = computed(() => ({
    primaryKeywordPhrase: this.primaryKeyword,
    title: this.browserTitle(),
    h1: this.h1(),
    metaDescription: this.metaDescription(),
    intro: this.intro(),
    sections: this.sections().map((s) => ({ h2: s.h2, body: s.body, images: [] })),
    internalLinks: [],
    cta: { label: 'Get in touch', href: '/get-in-touch' },
  }));

  readonly hints = computed(() => writingHints(this.templateSnapshot()));
  readonly serp = computed(() =>
    serpPreview({
      title: this.browserTitle(),
      metaDescription: this.metaDescription(),
      slug: this.slug(),
      siteHost: 'destinationweddingpainter.com',
    }),
  );

  readonly saveLabel = computed(() => (this.dirty() ? 'Save draft' : 'Saved'));
  readonly publishReview = signal(false);

  readonly publishBlockers = computed(() => {
    if (!this.publishReview()) {
      return [];
    }
    const blockers: { code: string; message: string }[] = [];
    const emptySections = this.sections().filter((s) => !s.body.trim());
    if (emptySections.length > 0) {
      blockers.push({
        code: 'sections',
        message: `${emptySections.length} section(s) still need body copy`,
      });
    }
    const metaLen = this.metaDescription().length;
    if (metaLen < this.metaMin || metaLen > this.metaMax) {
      blockers.push({
        code: 'meta',
        message: `Meta description should be ${this.metaMin}–${this.metaMax} characters`,
      });
    }
    return blockers;
  });

  @HostListener('document:click', ['$event'])
  closeFanOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.writer__insert')) {
      return;
    }
    this.openFanAt.set(null);
  }

  autoGrow(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }

  fanStyle(index: number, total: number): { [key: string]: string } {
    const spread = 108;
    const start = -90 - spread / 2;
    const angleDeg = total <= 1 ? -90 : start + (spread / (total - 1)) * index;
    const rad = (angleDeg * Math.PI) / 180;
    const radius = 54;
    return {
      '--fan-x': `${Math.cos(rad) * radius}px`,
      '--fan-y': `${Math.sin(rad) * radius}px`,
      '--fan-delay': `${index * 40}ms`,
    };
  }

  isFanOpen(at: number): boolean {
    return this.openFanAt() === at;
  }

  toggleFan(at: number, event: Event): void {
    event.stopPropagation();
    this.openFanAt.update((current) => (current === at ? null : at));
  }

  insertSectionAt(index: number, type: SectionBlockType, event: Event): void {
    event.stopPropagation();
    const defaults = SECTION_DEFAULTS[type];
    this.sections.update((list) => {
      const next = [...list];
      next.splice(index, 0, { type, h2: defaults.h2, body: defaults.body });
      return next;
    });
    this.openFanAt.set(null);
    this.markDirty();
  }

  sectionPlaceholder(section: WriterSection): string {
    if (section.type === 'quote') {
      return 'Pull quote or testimonial…';
    }
    if (section.type === 'list') {
      return 'One item per line…';
    }
    if (section.type === 'faq') {
      return 'Question and answer…';
    }
    if (section.type === 'image') {
      return 'Caption or alt text…';
    }
    return 'Write this section…';
  }

  headingPlaceholder(section: WriterSection): string {
    if (section.type === 'heading') {
      return 'Heading';
    }
    if (section.type === 'faq') {
      return 'Question';
    }
    return 'Section heading';
  }

  insertIntroSuggestion(): void {
    const text = this.introSuggestion();
    if (text) {
      this.intro.set(text);
      this.markDirty();
      this.dismissNote('intro-open');
    }
  }

  notesForAnchor(anchor: AiSuggestion['anchor'], sectionIndex?: number): AiSuggestion[] {
    if (!this.showAiNotes()) {
      return [];
    }
    return this.aiNotes().filter((n) => {
      if (n.anchor !== anchor) {
        return false;
      }
      if (anchor === 'section') {
        return n.sectionIndex === sectionIndex;
      }
      return true;
    });
  }

  notesForBlock(
    anchor: AiSuggestion['anchor'],
    side: 'left' | 'right',
    sectionIndex?: number,
  ): AiSuggestion[] {
    return this.notesForAnchor(anchor, sectionIndex).filter((n) => n.side === side);
  }

  isNoteExpanded(id: string): boolean {
    return this.expandedNoteId() === id;
  }

  toggleNote(id: string): void {
    this.expandedNoteId.update((current) => (current === id ? null : id));
  }

  dismissNote(id: string): void {
    this.dismissedNoteIds.update((set) => new Set([...set, id]));
    if (this.expandedNoteId() === id) {
      this.expandedNoteId.set(null);
    }
  }

  applyNote(note: AiSuggestion): void {
    if (note.action === 'none') {
      this.dismissNote(note.id);
      return;
    }
    if (note.action === 'insert-intro') {
      this.insertIntroSuggestion();
      return;
    }

    const si = note.sectionIndex ?? 0;
    if (note.action === 'insert-section-body') {
      this.sections.update((list) =>
        list.map((s, i) => (i === si ? { ...s, body: note.text } : s)),
      );
      this.markDirty();
      this.dismissNote(note.id);
      return;
    }

    if (note.action === 'append-section-body') {
      if (note.id === 'intro-range') {
        const suffix = ' Typical packages run $2,500–$6,000 depending on destination and canvas size.';
        this.intro.update((v) => (v.trim().endsWith('.') ? v + suffix : v + '.' + suffix));
        this.markDirty();
        this.dismissNote(note.id);
        return;
      }
      this.sections.update((list) =>
        list.map((s, i) =>
          i === si ? { ...s, body: s.body.trim() ? `${s.body.trim()} ${note.text}` : note.text } : s,
        ),
      );
      this.markDirty();
      this.dismissNote(note.id);
    }
  }

  markDirty(): void {
    this.dirty.set(true);
  }

  toggleSeo(): void {
    this.seoOpen.update((v) => !v);
  }

  addSection(): void {
    this.sections.update((list) => [...list, { type: 'text', h2: '', body: '' }]);
    this.markDirty();
  }

  removeSection(index: number): void {
    if (this.sections().length <= 1) {
      return;
    }
    this.sections.update((list) => list.filter((_, i) => i !== index));
    this.markDirty();
  }

  saveDraft(): void {
    this.dirty.set(false);
  }

  publish(): void {
    this.publishReview.set(true);
  }

  dismissPublishReview(): void {
    this.publishReview.set(false);
  }

  selectTool(id: WriterToolId): void {
    if (id === 'ai') {
      this.showAiNotes.update((v) => !v);
      if (!this.showAiNotes()) {
        this.expandedNoteId.set(null);
      }
      return;
    }
    if (id === 'section') {
      this.openFanAt.set(this.sections().length);
      this.activeTool.set('section');
      return;
    }
    if (id === 'serp') {
      this.showSerp.update((v) => !v);
      return;
    }
    if (id === 'hints') {
      this.showHints.update((v) => !v);
      return;
    }
    if (id === 'seo') {
      this.showSeoPanel.update((v) => !v);
      return;
    }
    this.activeTool.set(id);
  }

  isToolActive(id: WriterToolId): boolean {
    if (id === 'ai') return this.showAiNotes();
    if (id === 'serp') return this.showSerp();
    if (id === 'hints') return this.showHints();
    if (id === 'seo') return this.showSeoPanel();
    return this.activeTool() === id;
  }
}
