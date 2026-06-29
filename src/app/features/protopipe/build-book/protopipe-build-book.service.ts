import { Injectable, inject, signal } from '@angular/core';
import type { SitePageDraft, SitePageSectionDraft } from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import type { BuildBookProspectContext } from './build-book-context';
import {
  BUILD_BOOK_COMPONENT_DEFAULTS,
  type BuildBookComponentDefaults,
} from './build-book.defaults';
import {
  BUILD_BOOK_OPTIONS,
  BUILD_BOOK_SECTION_SLOTS,
  BUILD_BOOK_SECTION_ORDER,
  buildBookSectionLabel,
  findBuildBookOption,
  findBuildBookOptionByComponentId,
  findBuildBookOptionByLabLayout,
  type BuildBookSection,
} from './build-book.constants';
import {
  findBuildBookBlockDefinition,
  findBuildBookBlockDefinitionForSection,
} from './build-book-block.catalog';
import { findBuildBookBaselineAssembly } from './build-book-baseline-assemblies';
import { findBuildBookTemplate } from './build-book-template.catalog';
import type {
  BuildBookBlockDefinition,
  BuildBookBlockInstance,
  BuildBookOption,
  BuildBookPage,
} from './build-book.types';
import {
  ProtopipeBuildBookShireApiService,
  type BuildBookEntryMode,
  type BuildBookShireDto,
  type SaveBuildBookDto,
} from './protopipe-build-book-shire-api.service';

const COPY_FIELDS = [
  'heading',
  'subhead',
  'subheading',
  'eyebrow',
  'body',
  'ctaLabel',
  'ctaHref',
  'subtitle',
  'primaryCtaLabel',
  'primaryCtaHref',
  'secondaryCtaLabel',
  'secondaryCtaHref',
  'phoneLabel',
  'phoneHref',
  'submitLabel',
  'quote',
  'attribution',
  'role',
  'intro',
] as const;

function mergePropsOnSwap(
  oldProps: Record<string, unknown>,
  defaults: BuildBookComponentDefaults,
): Record<string, unknown> {
  const next = structuredClone(defaults.defaultProps);
  for (const key of COPY_FIELDS) {
    if (oldProps[key] != null && defaults.editableFields.includes(key)) {
      next[key] = oldProps[key];
    }
  }
  if (oldProps['imageSrc'] && defaults.editableFields.includes('backgroundImageSrc')) {
    next['backgroundImageSrc'] = oldProps['imageSrc'];
  }
  if (oldProps['backgroundImageSrc'] && defaults.editableFields.includes('imageSrc')) {
    next['imageSrc'] = oldProps['backgroundImageSrc'];
  }
  if (oldProps['backgroundImageSrc'] && defaults.editableFields.includes('visualSrc')) {
    next['visualSrc'] = oldProps['backgroundImageSrc'];
  }
  if (oldProps['imageSrc'] && defaults.editableFields.includes('visualSrc')) {
    next['visualSrc'] = oldProps['imageSrc'];
  }
  if (oldProps['heading'] && defaults.editableFields.includes('titleLines') && !next['titleLines']) {
    next['titleLines'] = [String(oldProps['heading'])];
  }
  return next;
}

function swapSectionComponent(
  section: SitePageSectionDraft,
  componentId: string,
  defaults: BuildBookComponentDefaults,
  option?: BuildBookOption,
): void {
  section.componentId = componentId;
  section.editableFields = [...defaults.editableFields];
  section.props = mergePropsOnSwap(section.props, defaults);
  if (option?.demo) {
    section.props['labUnit'] = option.demo.astroUnit;
    section.props['labBrand'] = option.demo.brand;
    section.props['labLayout'] = option.id;
    section.props['labCatalog'] = option.demo.catalog;
  } else {
    delete section.props['labUnit'];
    delete section.props['labBrand'];
    delete section.props['labLayout'];
    delete section.props['labCatalog'];
  }
}

function propsForBlock(block: BuildBookBlockDefinition): Record<string, unknown> {
  const props = structuredClone(block.defaultProps);
  if (block.demo) {
    props['labUnit'] = block.demo.astroUnit;
    props['labBrand'] = block.demo.brand;
    props['labLayout'] = block.id;
    props['labCatalog'] = block.demo.catalog;
  }
  return props;
}

function blockInstanceFromDefinition(
  section: BuildBookSection,
  block: BuildBookBlockDefinition,
  order: number,
  sourceTemplateId?: string,
): BuildBookBlockInstance {
  return {
    id: `home-${section}`,
    blockId: block.id,
    section,
    componentId: block.componentId,
    label: block.label,
    order,
    props: propsForBlock(block),
    sourceTemplateId: sourceTemplateId ?? block.sourceTemplateId,
  };
}

function materializeHomepagePages(templateId: string | null | undefined): BuildBookPage[] {
  const baselinePages = findBuildBookBaselineAssembly(templateId);
  if (baselinePages) return baselinePages;

  const template = findBuildBookTemplate(templateId);
  const refs =
    template?.defaultHomepageBlocks ??
    BUILD_BOOK_SECTION_ORDER.map((section) => ({
      section,
      blockId: BUILD_BOOK_OPTIONS[section][0]?.id,
    })).filter((ref): ref is { section: BuildBookSection; blockId: string } => Boolean(ref.blockId));

  const blocks = refs
    .map((ref, order) => {
      const block = findBuildBookBlockDefinitionForSection(ref.section, ref.blockId);
      return block ? blockInstanceFromDefinition(ref.section, block, order, template?.id) : null;
    })
    .filter((block) => block != null);

  return [
    {
      id: 'home',
      kind: 'homepage',
      label: 'Home',
      slug: '/',
      blocks,
    },
  ];
}

function draftFromBuildBookPages(templateId: string, pages: BuildBookPage[]): SitePageDraft {
  const now = new Date().toISOString();
  const homepage = pages.find((page) => page.kind === 'homepage') ?? pages[0];
  const seenSections = new Set<BuildBookSection>();
  return {
    templateId,
    theme: 'ocean',
    pages: [
      {
        id: 'home',
        label: homepage?.label ?? 'Home',
        sections: (homepage?.blocks ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block): SitePageSectionDraft => {
            const defaults = BUILD_BOOK_COMPONENT_DEFAULTS[block.componentId];
            const firstForSection = !seenSections.has(block.section);
            seenSections.add(block.section);
            return {
              id: firstForSection ? BUILD_BOOK_SECTION_SLOTS[block.section] : block.id,
              label: block.label ?? buildBookSectionLabel(block.section),
              componentId: block.componentId,
              props: structuredClone(block.props ?? defaults?.defaultProps ?? {}),
              editableFields: [...(defaults?.editableFields ?? [])],
            };
          }),
      },
    ],
    updatedAt: now,
  };
}

export function findDraftSectionForSlot(
  draft: SitePageDraft,
  slot: BuildBookSection,
): SitePageSectionDraft | null {
  const page = draft.pages[0];
  if (!page) return null;

  const preferredId = BUILD_BOOK_SECTION_SLOTS[slot];
  const bySlot = page.sections.find((s) => s.id === preferredId);
  if (bySlot) return bySlot;

  const componentIds = new Set(BUILD_BOOK_OPTIONS[slot].map((o) => o.componentId));
  return page.sections.find((s) => componentIds.has(s.componentId)) ?? null;
}

function buildStarterDraft(
  templateId = 'service-business-landing-v1',
  pages?: BuildBookPage[],
): SitePageDraft {
  if (pages?.length) return draftFromBuildBookPages(templateId, pages);

  const now = new Date().toISOString();
  const mk = (id: string, label: string, componentId: string): SitePageSectionDraft => {
    const defaults = BUILD_BOOK_COMPONENT_DEFAULTS[componentId];
    return {
      id,
      label,
      componentId,
      props: structuredClone(defaults?.defaultProps ?? {}),
      editableFields: [...(defaults?.editableFields ?? [])],
    };
  };

  return {
    templateId,
    theme: 'ocean',
    pages: [
      {
        id: 'home',
        label: 'Home',
        sections: [
          mk('hero', 'Hero', 'hero-split'),
          mk('logos', 'Social proof', 'logo-strip'),
          mk('features', 'Benefits', 'feature-grid'),
          mk('testimonials', 'Testimonials', 'testimonial-grid'),
          mk('faq', 'FAQ', 'faq-accordion'),
          mk('inquiry', 'Inquiry', 'cta-banner'),
        ],
      },
    ],
    updatedAt: now,
  };
}

@Injectable({ providedIn: 'root' })
export class ProtopipeBuildBookService {
  private readonly shireApi = inject(ProtopipeBuildBookShireApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _initializing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _saved = signal<SitePageDraft | null>(null);
  private readonly _draft = signal<SitePageDraft | null>(null);
  private readonly _dirty = signal(false);
  private readonly _selections = signal<Partial<Record<BuildBookSection, string>>>({});
  private readonly _prospectContext = signal<BuildBookProspectContext | null>(null);
  private readonly _entryMode = signal<BuildBookEntryMode>('template');
  private readonly _selectedTemplateId = signal<string | null>(null);
  private readonly _pages = signal<BuildBookPage[]>([]);
  private readonly _strategyNotes = signal('');

  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly initializing = this._initializing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly draft = this._draft.asReadonly();
  readonly dirty = this._dirty.asReadonly();
  readonly selections = this._selections.asReadonly();
  readonly prospectContext = this._prospectContext.asReadonly();
  readonly entryMode = this._entryMode.asReadonly();
  readonly selectedTemplateId = this._selectedTemplateId.asReadonly();
  readonly pages = this._pages.asReadonly();
  readonly strategyNotes = this._strategyNotes.asReadonly();

  readonly hasDraft = () => Boolean(this._draft());

  async load(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      await this.loadShireBook(siteId);
      this._dirty.set(false);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load build book'));
      this._saved.set(null);
      this._draft.set(null);
      this._selections.set({});
    } finally {
      this._loading.set(false);
    }
  }

  async initializeStarterDraft(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) return false;

    const templateId = this._selectedTemplateId();
    const pages = materializeHomepagePages(templateId);
    const draft = buildStarterDraft(templateId ?? undefined, pages);

    this._initializing.set(true);
    this._error.set(null);
    try {
      this._saved.set(structuredClone(draft));
      this._draft.set(structuredClone(draft));
      this._pages.set(structuredClone(pages));
      this.syncSelectionsFromDraft(draft);
      await this.saveShireBook(siteId, draft, pages);
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not create homepage draft'));
      return false;
    } finally {
      this._initializing.set(false);
    }
  }

  selectOption(section: BuildBookSection, optionId: string): void {
    const draft = this._draft();
    const option = findBuildBookOption(section, optionId);
    if (!draft || !option) return;

    const defaults = BUILD_BOOK_COMPONENT_DEFAULTS[option.componentId];
    if (!defaults) return;

    const target = findDraftSectionForSlot(draft, section);
    if (!target) return;

    swapSectionComponent(target, option.componentId, defaults, option);
    draft.updatedAt = new Date().toISOString();
    this._draft.set(structuredClone(draft));
    this._pages.set(this.pagesFromDraft(draft));
    this._selections.update((s) => ({ ...s, [section]: optionId }));
    this._dirty.set(true);
  }

  selectedOptionId(section: BuildBookSection): string | null {
    return this._selections()[section] ?? null;
  }

  markDirty(): void {
    this._dirty.set(true);
  }

  setProspectContext(context: BuildBookProspectContext | null): void {
    if (this.contextsEqual(this._prospectContext(), context)) return;
    this._prospectContext.set(context ? { ...context } : null);
    this._dirty.set(true);
  }

  setEntryMode(mode: BuildBookEntryMode): void {
    if (this._entryMode() === mode) return;
    this._entryMode.set(mode);
    this._dirty.set(true);
  }

  setSelectedTemplateId(templateId: string | null): void {
    if (this._selectedTemplateId() === templateId) return;
    this._selectedTemplateId.set(templateId);
    this._dirty.set(true);
  }

  setStrategyNotes(notes: string): void {
    if (this._strategyNotes() === notes) return;
    this._strategyNotes.set(notes);
    this._dirty.set(true);
  }

  isSectionConfigured(section: BuildBookSection): boolean {
    const draft = this._draft();
    if (!draft) return false;
    return Boolean(findDraftSectionForSlot(draft, section));
  }

  async save(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    const draft = this._draft();
    if (!siteId || !draft) return false;

    this._saving.set(true);
    this._error.set(null);
    try {
      const pages = this.pagesFromDraft(draft);
      this._pages.set(structuredClone(pages));
      await this.saveShireBook(siteId, draft, pages);
      this._saved.set(structuredClone(draft));
      this._draft.set(structuredClone(draft));
      this._dirty.set(false);
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not save build book'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  private syncSelectionsFromDraft(draft: SitePageDraft): void {
    const next: Partial<Record<BuildBookSection, string>> = {};
    for (const slot of Object.keys(BUILD_BOOK_SECTION_SLOTS) as BuildBookSection[]) {
      const section = findDraftSectionForSlot(draft, slot);
      if (!section) continue;
      const labLayout = section.props['labLayout'];
      const option =
        (typeof labLayout === 'string' ? findBuildBookOptionByLabLayout(slot, labLayout) : undefined) ??
        findBuildBookOptionByComponentId(slot, section.componentId);
      if (option) next[slot] = option.id;
    }
    this._selections.set(next);
  }

  private async loadShireBook(siteId: string): Promise<void> {
    const res = await this.shireApi.get(siteId);
    if (!res.buildBook) {
      this._saved.set(null);
      this._draft.set(null);
      this._selections.set({});
      this._prospectContext.set(null);
      this._entryMode.set('template');
      this._selectedTemplateId.set(null);
      this._pages.set([]);
      this._strategyNotes.set('');
      return;
    }
    this.applyShireBook(res.buildBook);
    const baselinePages = this.baselinePagesForBook(res.buildBook);
    const draft = baselinePages
      ? buildStarterDraft(res.buildBook.selectedTemplateId, baselinePages)
      : this.draftFromShireBook(res.buildBook);
    if (baselinePages) {
      draft.updatedAt = new Date().toISOString();
    }
    this._saved.set(structuredClone(draft));
    this._draft.set(structuredClone(draft));
    this._pages.set(
      baselinePages ??
        (res.buildBook.pages?.length ? structuredClone(res.buildBook.pages) : this.pagesFromDraft(draft)),
    );
    if (baselinePages) {
      await this.saveShireBook(siteId, draft, baselinePages);
    }
  }

  private applyShireBook(book: BuildBookShireDto): void {
    this._prospectContext.set(book.prospectContext ? { ...book.prospectContext } : null);
    this._entryMode.set(book.entryMode);
    this._selectedTemplateId.set(book.selectedTemplateId ?? null);
    this._pages.set(book.pages?.length ? structuredClone(book.pages) : []);
    this._strategyNotes.set(book.strategyNotes ?? '');
    if (book.sectionSelections.length > 0) {
      this._selections.set(
        Object.fromEntries(
          book.sectionSelections.map((selection) => [selection.section, selection.optionId]),
        ) as Partial<Record<BuildBookSection, string>>,
      );
    } else if (book.pages?.length) {
      this._selections.set(this.selectionsFromPages(book.pages));
    } else {
      this._selections.set({});
    }
  }

  private async saveShireBook(
    siteId: string,
    draft: SitePageDraft,
    pages = this.pagesFromDraft(draft),
  ): Promise<void> {
    const res = await this.shireApi.save(siteId, this.buildShirePayload(draft, pages));
    if (res.buildBook) {
      this.applyShireBook(res.buildBook);
    }
  }

  private draftFromShireBook(book: BuildBookShireDto): SitePageDraft {
    if (book.pages?.length) {
      const draft = buildStarterDraft(book.selectedTemplateId, book.pages);
      draft.updatedAt = book.updatedAt ?? new Date().toISOString();
      return draft;
    }

    const draft = buildStarterDraft(book.selectedTemplateId);
    for (const selection of book.sectionSelections) {
      const option = findBuildBookOption(selection.section, selection.optionId);
      if (!option) continue;
      const defaults = BUILD_BOOK_COMPONENT_DEFAULTS[option.componentId];
      const target = findDraftSectionForSlot(draft, selection.section);
      if (!defaults || !target) continue;
      swapSectionComponent(target, option.componentId, defaults, option);
    }
    draft.updatedAt = book.updatedAt ?? new Date().toISOString();
    return draft;
  }

  private baselinePagesForBook(book: BuildBookShireDto): BuildBookPage[] | null {
    const baselinePages = findBuildBookBaselineAssembly(book.selectedTemplateId);
    if (!baselinePages) return null;

    const savedHomepage = book.pages.find((page) => page.kind === 'homepage');
    const alreadyBaseline = savedHomepage?.blocks.some((block) => block.props['baselineRenderer']);
    if (alreadyBaseline) return null;

    return baselinePages;
  }

  private pagesFromDraft(draft: SitePageDraft): BuildBookPage[] {
    const existingHomepage = this._pages().find((page) => page.kind === 'homepage');
    if (existingHomepage?.blocks.some((block) => block.props['baselineRenderer'])) {
      return structuredClone(this._pages());
    }
    const selections = this._selections();
    const blocks = BUILD_BOOK_SECTION_ORDER.map((section, order) => {
      const draftSection = findDraftSectionForSlot(draft, section);
      if (!draftSection) return null;

      const labLayout = draftSection.props['labLayout'];
      const option =
        (selections[section] ? findBuildBookOption(section, selections[section]!) : undefined) ??
        (typeof labLayout === 'string' ? findBuildBookOptionByLabLayout(section, labLayout) : undefined) ??
        findBuildBookOptionByComponentId(section, draftSection.componentId);
      if (!option) return null;

      const existingBlock = existingHomepage?.blocks.find((block) => block.section === section);
      const definition = findBuildBookBlockDefinition(option.id);
      return {
        id: existingBlock?.id ?? `home-${section}`,
        blockId: option.id,
        section,
        componentId: draftSection.componentId,
        label: draftSection.label || option.label,
        order,
        props: structuredClone(draftSection.props),
        notes: existingBlock?.notes,
        sourceTemplateId:
          existingBlock?.sourceTemplateId ?? this._selectedTemplateId() ?? definition?.sourceTemplateId,
      };
    }).filter((block) => block != null);

    return [
      {
        id: existingHomepage?.id ?? 'home',
        kind: 'homepage',
        label: existingHomepage?.label ?? 'Home',
        slug: existingHomepage?.slug ?? '/',
        blocks,
      },
    ];
  }

  private selectionsFromPages(pages: BuildBookPage[]): Partial<Record<BuildBookSection, string>> {
    const homepage = pages.find((page) => page.kind === 'homepage') ?? pages[0];
    if (!homepage) return {};
    return Object.fromEntries(
      homepage.blocks.map((block) => [block.section, block.blockId]),
    ) as Partial<Record<BuildBookSection, string>>;
  }

  private buildShirePayload(draft: SitePageDraft, pages: BuildBookPage[]): SaveBuildBookDto {
    const sections = Object.keys(BUILD_BOOK_SECTION_SLOTS) as BuildBookSection[];
    const homepageStack = sections.filter((section) => Boolean(findDraftSectionForSlot(draft, section)));
    const selections = this._selections();
    return {
      prospectContext: this._prospectContext() ?? undefined,
      entryMode: this._entryMode(),
      selectedTemplateId: this._selectedTemplateId() ?? undefined,
      homepageStack,
      sectionSelections: sections
        .map((section) => {
          const optionId = selections[section];
          if (!optionId) return null;
          const option = findBuildBookOption(section, optionId);
          return {
            section,
            optionId,
            label: option?.label,
          };
        })
        .filter((selection) => selection != null),
      pages,
      strategyNotes: this._strategyNotes(),
    };
  }

  private contextsEqual(
    current: BuildBookProspectContext | null,
    next: BuildBookProspectContext | null,
  ): boolean {
    return JSON.stringify(current ?? null) === JSON.stringify(next ?? null);
  }
}
