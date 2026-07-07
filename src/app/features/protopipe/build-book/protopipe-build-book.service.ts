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
import {
  findBaselineApprovedHeroOption,
  isBaselineApprovedHeroLayout,
  resolveBaselineHeroLayoutId,
} from './build-book-baseline-hero.catalog';
import {
  baselineFoldBlockIdForLayout,
  findBaselineApprovedFoldOption,
  isBaselineApprovedFoldLayout,
  resolveBaselineFoldLayoutId,
} from './build-book-baseline-fold.catalog';
import { findBuildBookBaselineAssembly } from './build-book-baseline-assemblies';
import {
  blocksFromBaselineNavEntries,
  baselineNavEntriesFromBlocks,
  normalizeHeroContractPair,
} from './build-book-baseline-nav.util';
import {
  findDraftSectionForBlock,
  findPageBlockById,
  homepageBlocksFromPages,
  isBaselineBlockProps,
  isBaselineHomepage,
} from './build-book-baseline.util';
import { findBuildBookTemplate } from './build-book-template.catalog';
import type {
  BuildBookBlockDefinition,
  BuildBookBlockInstance,
  BuildBookOption,
  BuildBookPage,
} from './build-book.types';
import {
  clearHeroImageProps,
  heroCopyToProps,
  heroImageToProps,
  readHeroImageUrl,
} from './build-hero-block.util';
import {
  appendArrayItem,
  patchProp,
  removeArrayItem,
} from './fields/build-field.util';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from './build-hero-preview.types';
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

const HERO_IMAGE_PROP_KEYS = ['imageSrc', 'backgroundImageSrc', 'visualSrc'] as const;

function templateDefaultBlockProps(blockId: string): Record<string, unknown> | null {
  const def = findBuildBookBlockDefinition(blockId);
  if (!def) return null;

  const patch: Record<string, unknown> = {};
  for (const key of def.editableFields) {
    if (def.defaultProps[key] !== undefined) {
      patch[key] = structuredClone(def.defaultProps[key]);
    }
  }
  return Object.keys(patch).length ? patch : null;
}

function templateDefaultHeroImageProps(blockId: string): Record<string, unknown> | null {
  const def = findBuildBookBlockDefinition(blockId);
  if (!def) return null;

  const url = readHeroImageUrl(def.defaultProps);
  if (!url) return null;

  const patch: Record<string, unknown> = { ...heroImageToProps(url) };
  const backgroundImageAlt = def.defaultProps['backgroundImageAlt'];
  const imageAlt = def.defaultProps['imageAlt'];
  if (typeof backgroundImageAlt === 'string') patch['backgroundImageAlt'] = backgroundImageAlt;
  if (typeof imageAlt === 'string') patch['imageAlt'] = imageAlt;
  return patch;
}

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

  const heroImageUrl = readHeroImageUrl(oldProps);
  if (heroImageUrl) {
    for (const key of HERO_IMAGE_PROP_KEYS) {
      if (defaults.editableFields.includes(key)) {
        next[key] = heroImageUrl;
      }
    }
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
            const isBaseline = isBaselineBlockProps(block.props);
            const firstForSection = !seenSections.has(block.section);
            seenSections.add(block.section);
            return {
              id: isBaseline
                ? block.id
                : firstForSection
                  ? BUILD_BOOK_SECTION_SLOTS[block.section]
                  : block.id,
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

function resolveBuildBookOptionId(
  section: BuildBookSection,
  draftSection: SitePageSectionDraft | null,
  block?: BuildBookBlockInstance,
): string | null {
  if (block?.blockId && findBuildBookBlockDefinition(block.blockId)) {
    return block.blockId;
  }

  const labLayout =
    (typeof block?.props['labLayout'] === 'string' ? block.props['labLayout'] : undefined) ??
    (typeof draftSection?.props['labLayout'] === 'string' ? draftSection.props['labLayout'] : undefined);
  if (labLayout) {
    const byLab = findBuildBookOptionByLabLayout(section, labLayout);
    if (byLab) return byLab.id;
  }

  if (block?.blockId && findBuildBookOption(section, block.blockId)) {
    return block.blockId;
  }

  const componentId = block?.componentId ?? draftSection?.componentId;
  if (componentId) {
    const byComponent = findBuildBookOptionByComponentId(section, componentId, labLayout);
    if (byComponent) return byComponent.id;
  }

  return block?.blockId ?? null;
}

export { findDraftSectionForBlock } from './build-book-baseline.util';

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

  updateSectionProps(section: BuildBookSection, patch: Record<string, unknown>): void {
    const draft = this._draft();
    if (!draft) return;

    const target = findDraftSectionForSlot(draft, section);
    if (!target) return;

    const nextDraft = structuredClone(draft);
    const nextTarget = findDraftSectionForSlot(nextDraft, section)!;
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) {
        delete nextTarget.props[key];
      } else {
        nextTarget.props[key] = value;
      }
    }
    this.commitSectionDraft(nextDraft);
  }

  updateSectionPropPath(section: BuildBookSection, path: string, value: unknown): void {
    const draft = this._draft();
    if (!draft) return;

    const target = findDraftSectionForSlot(draft, section);
    if (!target) return;

    const nextDraft = structuredClone(draft);
    const nextTarget = findDraftSectionForSlot(nextDraft, section)!;
    nextTarget.props = patchProp(nextTarget.props, path, value);
    this.commitSectionDraft(nextDraft);
  }

  updateSectionArray(section: BuildBookSection, key: string, items: unknown[]): void {
    this.updateSectionProps(section, { [key]: items });
  }

  appendSectionArrayItem(section: BuildBookSection, key: string, item: unknown): void {
    const draft = this._draft();
    if (!draft) return;
    const target = findDraftSectionForSlot(draft, section);
    if (!target) return;
    const nextDraft = structuredClone(draft);
    const nextTarget = findDraftSectionForSlot(nextDraft, section)!;
    nextTarget.props = appendArrayItem(nextTarget.props, key, item);
    this.commitSectionDraft(nextDraft);
  }

  removeSectionArrayItem(section: BuildBookSection, key: string, index: number): void {
    const draft = this._draft();
    if (!draft) return;
    const target = findDraftSectionForSlot(draft, section);
    if (!target) return;
    const nextDraft = structuredClone(draft);
    const nextTarget = findDraftSectionForSlot(nextDraft, section)!;
    nextTarget.props = removeArrayItem(nextTarget.props, key, index);
    this.commitSectionDraft(nextDraft);
  }

  sectionProps(section: BuildBookSection): Record<string, unknown> | null {
    const draft = this._draft();
    if (!draft) return null;
    return findDraftSectionForSlot(draft, section)?.props ?? null;
  }

  setSectionProps(section: BuildBookSection, props: Record<string, unknown>): void {
    const draft = this._draft();
    if (!draft) return;

    const target = findDraftSectionForSlot(draft, section);
    if (!target) return;

    const nextDraft = structuredClone(draft);
    const nextTarget = findDraftSectionForSlot(nextDraft, section)!;
    nextTarget.props = structuredClone(props);
    this.commitSectionDraft(nextDraft);
  }

  private commitSectionDraft(nextDraft: SitePageDraft): void {
    nextDraft.updatedAt = new Date().toISOString();
    this._draft.set(nextDraft);
    if (isBaselineHomepage(this._pages())) {
      this.syncBaselinePagesFromDraft(nextDraft);
    } else {
      this._pages.set(this.pagesFromDraft(nextDraft));
    }
    this._dirty.set(true);
  }

  private syncBaselinePagesFromDraft(draft: SitePageDraft): void {
    const pages = structuredClone(this._pages());
    const homepage = pages.find((page) => page.kind === 'homepage');
    if (!homepage) return;

    for (const block of homepage.blocks) {
      const section = findDraftSectionForBlock(draft, block);
      if (!section) continue;
      block.props = structuredClone(section.props);
      if (section.label) block.label = section.label;
    }

    this._pages.set(pages);
  }

  private findPageBlock(blockInstanceId: string): BuildBookBlockInstance | null {
    return findPageBlockById(this._pages(), blockInstanceId);
  }

  updateBlockPropPath(blockInstanceId: string, path: string, value: unknown): void {
    const draft = this._draft();
    const block = this.findPageBlock(blockInstanceId);
    if (!draft || !block) return;

    const nextDraft = structuredClone(draft);
    const target = findDraftSectionForBlock(nextDraft, block);
    if (!target) return;

    target.props = patchProp(target.props, path, value);
    this.commitSectionDraft(nextDraft);
  }

  updateBlockProps(blockInstanceId: string, patch: Record<string, unknown>): void {
    const draft = this._draft();
    const block = this.findPageBlock(blockInstanceId);
    if (!draft || !block) return;

    const nextDraft = structuredClone(draft);
    const target = findDraftSectionForBlock(nextDraft, block);
    if (!target) return;

    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) {
        delete target.props[key];
      } else {
        target.props[key] = value;
      }
    }
    this.commitSectionDraft(nextDraft);
  }

  setBlockProps(blockInstanceId: string, props: Record<string, unknown>): void {
    const draft = this._draft();
    const block = this.findPageBlock(blockInstanceId);
    if (!draft || !block) return;

    const nextDraft = structuredClone(draft);
    const target = findDraftSectionForBlock(nextDraft, block);
    if (!target) return;

    target.props = structuredClone(props);
    this.commitSectionDraft(nextDraft);
  }

  selectBaselineLayoutOption(blockInstanceId: string, optionId: string): void {
    const block = this.findPageBlock(blockInstanceId);
    if (!block || (block.section !== 'hero' && block.section !== 'fold')) return;

    const section = block.section;
    const option =
      findBuildBookOption(section, optionId) ??
      (section === 'hero'
        ? findBaselineApprovedHeroOption(optionId)
        : findBaselineApprovedFoldOption(optionId));
    if (!option) return;

    const previousLayout =
      section === 'hero'
        ? resolveBaselineHeroLayoutId(block.blockId, block.props)
        : resolveBaselineFoldLayoutId(block.blockId, block.props);

    const patch: Record<string, unknown> = {
      labLayout: option.id,
    };

    if (option.demo) {
      patch['labUnit'] = option.demo.astroUnit;
      patch['labCatalog'] = option.demo.catalog;
    }

    if (section === 'hero') {
      if (
        isBaselineApprovedHeroLayout(option.id) &&
        !isBaselineApprovedHeroLayout(previousLayout)
      ) {
        Object.assign(patch, templateDefaultHeroImageProps(block.blockId) ?? {});
      }
    } else {
      const targetBlockId = baselineFoldBlockIdForLayout(option.id);
      if (targetBlockId) {
        Object.assign(patch, templateDefaultBlockProps(targetBlockId) ?? {});
      } else {
        const defaults = BUILD_BOOK_COMPONENT_DEFAULTS[option.componentId];
        if (defaults) {
          Object.assign(patch, structuredClone(defaults.defaultProps));
        }
      }
    }

    this.updateBlockProps(blockInstanceId, patch);
  }

  selectBaselineHeroOption(blockInstanceId: string, optionId: string): void {
    this.selectBaselineLayoutOption(blockInstanceId, optionId);
  }

  resetBaselineHeroImageToTemplateDefault(blockInstanceId: string): void {
    const block = this.findPageBlock(blockInstanceId);
    if (!block || block.section !== 'hero') return;

    const patch = templateDefaultHeroImageProps(block.blockId);
    if (!patch) return;

    this.updateBlockProps(blockInstanceId, patch);
  }

  blockProps(blockInstanceId: string): Record<string, unknown> | null {
    const block = this.findPageBlock(blockInstanceId);
    return block ? structuredClone(block.props) : null;
  }

  isBaselineTemplateActive(): boolean {
    return isBaselineHomepage(this._pages());
  }

  homepageBlocks(): BuildBookBlockInstance[] {
    return homepageBlocksFromPages(this._pages());
  }

  reorderHomepageBlocks(fromIndex: number, toIndex: number): void {
    this.reorderHomepageNavEntries(fromIndex, toIndex);
  }

  reorderHomepageNavEntries(fromEntryIndex: number, toEntryIndex: number): void {
    if (fromEntryIndex === toEntryIndex) return;

    const pages = structuredClone(this._pages());
    const homepage = pages.find((page) => page.kind === 'homepage');
    if (!homepage) return;

    const blocks = homepageBlocksFromPages(pages);
    const entries = baselineNavEntriesFromBlocks(blocks);
    if (
      fromEntryIndex < 0 ||
      toEntryIndex < 0 ||
      fromEntryIndex >= entries.length ||
      toEntryIndex >= entries.length
    ) {
      return;
    }

    const [moved] = entries.splice(fromEntryIndex, 1);
    entries.splice(toEntryIndex, 0, moved);
    const flattened = normalizeHeroContractPair(blocksFromBaselineNavEntries(entries));
    homepage.blocks = flattened;
    this.commitHomepageStructure(pages);
  }

  addHomepageBlock(blockId: string, insertAfterIndex?: number): void {
    const definition = findBuildBookBlockDefinition(blockId);
    if (!definition) return;

    const pages = structuredClone(this._pages());
    const homepage = pages.find((page) => page.kind === 'homepage');
    if (!homepage) return;

    const blocks = [...homepage.blocks].sort((a, b) => a.order - b.order);
    const existingCount = blocks.filter((block) => block.blockId === blockId).length;
    const nextBlock: BuildBookBlockInstance = {
      id: `home-${blockId}-${existingCount + 1}`,
      blockId,
      section: definition.section,
      componentId: definition.componentId,
      label: definition.label,
      order: blocks.length,
      props: structuredClone(definition.defaultProps),
      sourceTemplateId: definition.sourceTemplateId ?? this._selectedTemplateId() ?? undefined,
    };

    const insertAt =
      insertAfterIndex == null || insertAfterIndex < 0
        ? blocks.length
        : Math.min(insertAfterIndex + 1, blocks.length);
    blocks.splice(insertAt, 0, nextBlock);
    homepage.blocks = blocks.map((block, order) => ({ ...block, order }));
    this.commitHomepageStructure(pages);
  }

  removeHomepageBlock(blockInstanceId: string): void {
    const block = this.findPageBlock(blockInstanceId);
    if (!block) return;
    if (
      block.blockId === 'wri-baseline-hero-life-proof' ||
      block.blockId === 'wri-baseline-contract-bar' ||
      block.blockId === 'sparky-baseline-hero-callout' ||
      block.blockId === 'wilco-baseline-hero-split'
    ) {
      return;
    }

    const pages = structuredClone(this._pages());
    const homepage = pages.find((page) => page.kind === 'homepage');
    if (!homepage) return;

    homepage.blocks = homepage.blocks
      .filter((item) => item.id !== blockInstanceId)
      .sort((a, b) => a.order - b.order)
      .map((item, order) => ({ ...item, order }));
    this.commitHomepageStructure(pages);
  }

  private commitHomepageStructure(nextPages: BuildBookPage[]): void {
    const templateId = this._selectedTemplateId() ?? 'wri-field-authority-v1';
    const draft = draftFromBuildBookPages(templateId, nextPages);
    this._pages.set(structuredClone(nextPages));
    this._draft.set(draft);
    this._dirty.set(true);
  }

  updateHeroCopy(copy: BuildHeroPreviewCopy): void {
    this.updateSectionProps('hero', heroCopyToProps(copy));
  }

  updateHeroImage(url: string): void {
    this.updateSectionProps('hero', heroImageToProps(url));
  }

  clearHeroImage(): void {
    this.updateSectionProps('hero', clearHeroImageProps());
  }

  seedHeroEyebrow(siteName: string): void {
    const draft = this._draft();
    if (!draft) return;

    const hero = findDraftSectionForSlot(draft, 'hero');
    if (!hero) return;

    const eyebrow = hero.props['eyebrow'];
    if (typeof eyebrow !== 'string' || eyebrow !== DEFAULT_HERO_PREVIEW_COPY.eyebrow) return;

    const nextDraft = structuredClone(draft);
    const nextHero = findDraftSectionForSlot(nextDraft, 'hero')!;
    nextHero.props['eyebrow'] = siteName;
    this._draft.set(nextDraft);
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
      let draftToSave = draft;
      let pages: BuildBookPage[];
      if (isBaselineHomepage(this._pages())) {
        pages = structuredClone(this._pages());
        draftToSave = draftFromBuildBookPages(this._selectedTemplateId() ?? '', pages);
        this._draft.set(structuredClone(draftToSave));
      } else {
        pages = this.pagesFromDraft(draft);
        this._pages.set(structuredClone(pages));
      }
      await this.saveShireBook(siteId, draftToSave, pages);
      this._saved.set(structuredClone(draftToSave));
      this._draft.set(structuredClone(draftToSave));
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
    const homepage = this._pages().find((page) => page.kind === 'homepage');
    const next: Partial<Record<BuildBookSection, string>> = {};
    for (const slot of Object.keys(BUILD_BOOK_SECTION_SLOTS) as BuildBookSection[]) {
      const section = findDraftSectionForSlot(draft, slot);
      if (!section) continue;
      const block = homepage?.blocks.find((item) => item.section === slot);
      const optionId = resolveBuildBookOptionId(slot, section, block);
      if (optionId) next[slot] = optionId;
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
    this.syncSelectionsFromDraft(draft);
    const savedPages = res.buildBook.pages?.length ? structuredClone(res.buildBook.pages) : null;
    this._pages.set(baselinePages ?? savedPages ?? this.pagesFromDraft(draft));
    if (baselinePages) {
      await this.saveShireBook(siteId, draft, this.pagesFromDraft(draft));
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
      if (isBaselineHomepage(this._pages())) {
        const syncedDraft = draftFromBuildBookPages(
          this._selectedTemplateId() ?? '',
          this._pages(),
        );
        this._draft.set(syncedDraft);
        this._saved.set(structuredClone(syncedDraft));
      } else {
        const draft = this._draft();
        if (draft) {
          this.syncSelectionsFromDraft(draft);
          this._pages.set(this.pagesFromDraft(draft));
        }
      }
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

      const labLayout =
        typeof draftSection.props['labLayout'] === 'string' ? draftSection.props['labLayout'] : undefined;
      const option =
        (typeof labLayout === 'string' ? findBuildBookOptionByLabLayout(section, labLayout) : undefined) ??
        (selections[section] ? findBuildBookOption(section, selections[section]!) : undefined) ??
        findBuildBookOptionByComponentId(section, draftSection.componentId, labLayout);
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
    const next: Partial<Record<BuildBookSection, string>> = {};
    for (const block of homepage.blocks) {
      const optionId = resolveBuildBookOptionId(block.section, null, block);
      if (optionId) next[block.section] = optionId;
    }
    return next;
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
