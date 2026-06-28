import { Injectable, inject, signal } from '@angular/core';
import type { SitePageDraft, SitePageSectionDraft } from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { isShirePrimary } from '../shire/shire-http.util';
import type { BuildBookProspectContext } from './build-book-context';
import {
  BUILD_BOOK_COMPONENT_DEFAULTS,
  type BuildBookComponentDefaults,
} from './build-book.defaults';
import {
  BUILD_BOOK_OPTIONS,
  BUILD_BOOK_SECTION_SLOTS,
  findBuildBookOption,
  findBuildBookOptionByComponentId,
  findBuildBookOptionByLabLayout,
  type BuildBookSection,
} from './build-book.constants';
import type { BuildBookOption } from './build-book.types';
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

function buildStarterDraft(): SitePageDraft {
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
    templateId: 'service-business-landing-v1',
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
  private readonly api = inject(ProtopipeApiService);
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
  readonly strategyNotes = this._strategyNotes.asReadonly();

  readonly hasDraft = () => Boolean(this._draft());

  async load(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      if (isShirePrimary()) {
        await this.loadShireBook(siteId);
      }
      const res = await this.api.getLegacySitePage(siteId);
      if (res.pageDraft) {
        this._saved.set(structuredClone(res.pageDraft));
        this._draft.set(structuredClone(res.pageDraft));
        this._dirty.set(false);
        this.syncSelectionsFromDraft(res.pageDraft);
      } else {
        this._saved.set(null);
        this._draft.set(null);
        this._selections.set({});
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load build book'));
      this._saved.set(null);
      this._draft.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  async initializeStarterDraft(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) return false;

    const draft = buildStarterDraft();

    this._initializing.set(true);
    this._error.set(null);
    try {
      const res = await this.api.updateLegacySitePage(siteId, { pageDraft: draft });
      this._saved.set(structuredClone(res.pageDraft));
      this._draft.set(structuredClone(res.pageDraft));
      this._dirty.set(false);
      this.syncSelectionsFromDraft(res.pageDraft);
      if (isShirePrimary()) {
        await this.saveShireBook(siteId, res.pageDraft);
      }
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
      const res = await this.api.updateLegacySitePage(siteId, { pageDraft: draft });
      this._saved.set(structuredClone(res.pageDraft));
      this._draft.set(structuredClone(res.pageDraft));
      this.syncSelectionsFromDraft(res.pageDraft);
      if (isShirePrimary()) {
        await this.saveShireBook(siteId, res.pageDraft);
      }
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
    if (!res.buildBook) return;
    this.applyShireBook(res.buildBook);
  }

  private applyShireBook(book: BuildBookShireDto): void {
    this._prospectContext.set(book.prospectContext ? { ...book.prospectContext } : null);
    this._entryMode.set(book.entryMode);
    this._selectedTemplateId.set(book.selectedTemplateId ?? null);
    this._strategyNotes.set(book.strategyNotes ?? '');
    if (book.sectionSelections.length > 0) {
      this._selections.set(
        Object.fromEntries(
          book.sectionSelections.map((selection) => [selection.section, selection.optionId]),
        ) as Partial<Record<BuildBookSection, string>>,
      );
    }
  }

  private async saveShireBook(siteId: string, draft: SitePageDraft): Promise<void> {
    const res = await this.shireApi.save(siteId, this.buildShirePayload(draft));
    if (res.buildBook) {
      this.applyShireBook(res.buildBook);
    }
  }

  private buildShirePayload(draft: SitePageDraft): SaveBuildBookDto {
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
