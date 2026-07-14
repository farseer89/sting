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
  resolvePatternIdForBlock,
  variantsForPattern,
} from './build-book-block-registry.util';
import { enrichHilPages } from './build-book-hil-props.util';
import {
  findBaselineApprovedHeroOption,
  isBaselineApprovedHeroLayout,
  resolveBaselineHeroLayoutId,
} from './build-book-baseline-hero.catalog';
import { heroPreviewImageForLayout } from './build-book-demo.catalog';
import { isVeilHeroLabLayout, veilHeroLabPreviewProps } from './build-book-veil-hero.catalog';
import { baselineHeroBlockIdForLayout } from './option-preview/build-book-option-preview.util';
import {
  baselineFoldBlockIdForLayout,
  findBaselineApprovedFoldOption,
  isBaselineApprovedFoldLayout,
  resolveBaselineFoldLayoutId,
} from './build-book-baseline-fold.catalog';
import { findBuildBookBaselineAssembly } from './build-book-baseline-assemblies';
import { buildBookTemplateIdForSlug } from './agency-pilot-sites';
import {
  blocksFromBaselineNavEntries,
  baselineNavEntriesFromBlocks,
  normalizeHeroContractPair,
} from './build-book-baseline-nav.util';
import {
  findDraftSectionForBlock,
  findPageBlockById,
  findPageById,
  findPageByKind,
  findPageContainingBlock,
  blocksForPage as blocksForPageUtil,
  homepageBlocksFromPages,
  isBaselineBlockProps,
  isBaselineHomepage,
} from './build-book-baseline.util';
import { isPinnedBaselineBlockId } from './build-book-pinned-blocks.util';
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
import { ProtopipeShireSitesApiService } from './protopipe-shire-sites-api.service';
import { compileBuildBookHomepage } from './build-book-publish-compiler.util';
import {
  fillBlogPostBlockProps,
  type BlogArticleFillSource,
} from './build-book-article-fill.util';
import {
  validateBuildBookPublishGate,
  type BuildBookPublishGateResult,
} from './validation/build-book-publish-gate.util';
import { ProtopipeMediaStudioService } from '../protopipe-media-studio.service';
import { ProtopipeBrandBookService } from '../brand-book/protopipe-brand-book.service';
import {
  exportSiteThemeForPublish,
  materializeBlockPropsForInsert,
  resolveSiteDesignContext,
  type ResolveSiteDesignContextInput,
  type SiteDesignContext,
  type SiteThemePersistedOverride,
} from '../site-design/public';
import type { BuildBookPageKind } from './build-book.types';

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

function backfillPatternIdsOnPages(pages: BuildBookPage[]): BuildBookPage[] {
  const withPatternIds = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => ({
      ...block,
      patternId: block.patternId ?? resolvePatternIdForBlock(block.blockId),
    })),
  }));
  return enrichHilPages(withPatternIds);
}

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
            const definition = findBuildBookBlockDefinition(block.blockId);
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
              editableFields: [...(definition?.editableFields ?? defaults?.editableFields ?? [])],
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
  private readonly shireSitesApi = inject(ProtopipeShireSitesApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly mediaStudio = inject(ProtopipeMediaStudioService);
  private readonly brandBook = inject(ProtopipeBrandBookService);

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
  private readonly _siteTheme = signal<SiteThemePersistedOverride | null>(null);
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
  readonly siteTheme = this._siteTheme.asReadonly();
  readonly pages = this._pages.asReadonly();
  readonly strategyNotes = this._strategyNotes.asReadonly();

  readonly hasDraft = () => Boolean(this._draft());

  resolveSiteDesignContext(
    pageId: string | null,
    pageKind: BuildBookPageKind = 'homepage',
  ): SiteDesignContext | null {
    const siteId = this.strategy.siteId();
    if (!siteId) return null;

    const site = this.strategy.site();
    const brandPalette = this.brandBook.brandBook()?.infographStyle?.palette;
    const input: ResolveSiteDesignContextInput = {
      siteId,
      templateId: this._selectedTemplateId(),
      pageId,
      pageKind,
      siteDisplayName: site?.displayName ?? undefined,
      siteUrl: site?.url ?? site?.hostname ?? undefined,
      themeOverride: this._siteTheme()?.colorOverride,
      typographyOverride: this._siteTheme()?.typographyOverride,
      brandPalette: brandPalette
        ? {
            primary: brandPalette.primary,
            accent: brandPalette.accent,
            background: brandPalette.background,
          }
        : undefined,
      studioAssets: this.mediaStudio.assets().map((asset) => ({
        id: asset.id,
        url: asset.url,
        label: asset.label,
        originalFilename: asset.originalFilename,
        source: asset.source,
      })),
    };

    return resolveSiteDesignContext(input, this._pages());
  }

  materializeBlockPropsForPage(blockId: string, pageId: string | null): Record<string, unknown> {
    const ctx = this.resolveSiteDesignContext(pageId);
    if (!ctx) {
      const def = findBuildBookBlockDefinition(blockId);
      return def ? structuredClone(def.defaultProps) : {};
    }
    return materializeBlockPropsForInsert(blockId, ctx);
  }

  /** Phase 6 — export resolved theme tokens for client-sites publish. */
  exportPublishSiteTheme(pageId: string | null = null): Record<string, unknown> | null {
    const ctx = this.resolveSiteDesignContext(pageId);
    return ctx ? exportSiteThemeForPublish(ctx) : null;
  }

  validateForPublish(): BuildBookPublishGateResult {
    const homepage = this._pages().find((page) => page.kind === 'homepage') ?? null;
    return validateBuildBookPublishGate({
      homepage,
      site: this.strategy.site(),
      dirty: this._dirty(),
    });
  }

  compileForPublish() {
    const homepage = this._pages().find((page) => page.kind === 'homepage');
    if (!homepage) {
      throw new Error('Homepage is required to publish');
    }
    const draft = this._draft();
    return compileBuildBookHomepage({
      homepage,
      sourceTemplateId: this._selectedTemplateId() ?? undefined,
      theme: draft?.theme,
      siteTheme: this.exportPublishSiteTheme(this.homepagePageId()),
    });
  }

  async publishSite(): Promise<{ ok: boolean; message?: string }> {
    const siteId = this.strategy.siteId();
    if (!siteId) return { ok: false };

    const gate = this.validateForPublish();
    if (!gate.ok) {
      this._error.set(gate.issues[0]?.message ?? 'Cannot publish yet');
      return { ok: false };
    }

    this._saving.set(true);
    this._error.set(null);
    try {
      const pagePublished = this.compileForPublish();
      const res = await this.shireSitesApi.publish(siteId, { pagePublished });
      this.strategy.mergeSite({
        publishStatus: res.publishStatus,
        provisioningError: undefined,
      });
      return { ok: true, message: res.message };
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not publish site'));
      return { ok: false };
    } finally {
      this._saving.set(false);
    }
  }

  async refreshSitePublishStatus(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    const site = await this.shireSitesApi.get(siteId);
    this.strategy.mergeSite(site);
  }

  patchSiteThemeColorOverride(colorOverride: SiteThemePersistedOverride['colorOverride']): void {
    this.patchSiteTheme({ colorOverride: colorOverride ?? undefined });
  }

  patchSiteTheme(patch: SiteThemePersistedOverride): void {
    const current = this._siteTheme();
    const next: SiteThemePersistedOverride = {
      colorOverride: patch.colorOverride
        ? { ...current?.colorOverride, ...patch.colorOverride }
        : current?.colorOverride,
      typographyOverride: patch.typographyOverride
        ? { ...current?.typographyOverride, ...patch.typographyOverride }
        : current?.typographyOverride,
    };

    const hasColors = next.colorOverride && Object.keys(next.colorOverride).length > 0;
    const hasTypography =
      next.typographyOverride && Object.keys(next.typographyOverride).length > 0;

    this._siteTheme.set(hasColors || hasTypography ? next : null);
    this._dirty.set(true);
  }

  resetSiteTheme(): void {
    this._siteTheme.set(null);
    this._dirty.set(true);
  }

  clearSiteThemeColorOverride(): void {
    const current = this._siteTheme();
    if (!current?.typographyOverride || Object.keys(current.typographyOverride).length === 0) {
      this.resetSiteTheme();
      return;
    }
    this._siteTheme.set({ typographyOverride: current.typographyOverride });
    this._dirty.set(true);
  }

  clearSiteThemeTypographyOverride(): void {
    const current = this._siteTheme();
    if (!current?.colorOverride || Object.keys(current.colorOverride).length === 0) {
      this.resetSiteTheme();
      return;
    }
    this._siteTheme.set({ colorOverride: current.colorOverride });
    this._dirty.set(true);
  }

  async load(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      await this.loadShireBook(siteId);
      await this.ensureHostedSiteBaseline();
      const profileIdsBefore = new Set(this.blogTemplateProfiles().map((p) => p.id));
      this.ensureBlogTemplateProfiles();
      const profilesAdded = this.blogTemplateProfiles().some((p) => !profileIdsBefore.has(p.id));
      if (profilesAdded) {
        await this.save();
      } else {
        this._dirty.set(false);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load build book'));
      this._saved.set(null);
      this._draft.set(null);
      this._selections.set({});
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Registered hosted pilots (DWP / Sparky / WRI) should edit their live baseline,
   * not land on a blank "view template" state that later falls through to WRI chrome.
   */
  async ensureHostedSiteBaseline(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    const mappedTemplateId = buildBookTemplateIdForSlug(
      this.strategy.site()?.clientSitesSlug,
    );
    if (!siteId || !mappedTemplateId) return false;

    const alreadyBound = this._selectedTemplateId() === mappedTemplateId;
    if (!alreadyBound) {
      this._selectedTemplateId.set(mappedTemplateId);
    }

    if (!this.hasDraft() || this._pages().length === 0) {
      return this.initializeStarterDraft();
    }

    if (!alreadyBound) {
      // Keep existing pages (content posts, etc.) but persist the correct template binding.
      const draft = this._draft();
      if (draft) {
        draft.templateId = mappedTemplateId;
        this._draft.set(structuredClone(draft));
      }
      this._dirty.set(true);
      return this.save();
    }

    return false;
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
    const block = this.findPageBlock(blockInstanceId);
    if (!block) return;

    const page = findPageContainingBlock(this._pages(), blockInstanceId);
    if (page && page.kind !== 'homepage') {
      this.patchNonHomepageBlockProps(blockInstanceId, (props) => patchProp(props, path, value));
      return;
    }

    const draft = this._draft();
    if (!draft) return;

    const nextDraft = structuredClone(draft);
    const target = findDraftSectionForBlock(nextDraft, block);
    if (!target) return;

    target.props = patchProp(target.props, path, value);
    this.commitSectionDraft(nextDraft);
  }

  updateBlockProps(blockInstanceId: string, patch: Record<string, unknown>): void {
    const block = this.findPageBlock(blockInstanceId);
    if (!block) return;

    const page = findPageContainingBlock(this._pages(), blockInstanceId);
    if (page && page.kind !== 'homepage') {
      this.patchNonHomepageBlockProps(blockInstanceId, (props) => {
        const next = { ...props };
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined) {
            delete next[key];
          } else {
            next[key] = value;
          }
        }
        return next;
      });
      return;
    }

    const draft = this._draft();
    if (!draft) return;

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
    const block = this.findPageBlock(blockInstanceId);
    if (!block) return;

    const page = findPageContainingBlock(this._pages(), blockInstanceId);
    if (page && page.kind !== 'homepage') {
      this.patchNonHomepageBlockProps(blockInstanceId, () => structuredClone(props));
      return;
    }

    const draft = this._draft();
    if (!draft) return;

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

    const patch: Record<string, unknown> = {
      labLayout: option.id,
    };

    if (option.demo) {
      patch['labUnit'] = option.demo.astroUnit;
      patch['labCatalog'] = option.demo.catalog;
    }

    if (section === 'hero') {
      if (isBaselineApprovedHeroLayout(option.id)) {
        const approvedBlockId = baselineHeroBlockIdForLayout(option.id);
        const def = approvedBlockId ? findBuildBookBlockDefinition(approvedBlockId) : null;
        if (def) {
          const nextProps: Record<string, unknown> = {
            ...structuredClone(def.defaultProps),
            labLayout: option.id,
          };
          for (const key of ['eyebrow', 'heading', 'subhead', 'primaryCtaLabel', 'secondaryCtaLabel'] as const) {
            if (typeof block.props[key] === 'string' && block.props[key]) {
              nextProps[key] = block.props[key];
            }
          }
          if (option.demo) {
            nextProps['labUnit'] = option.demo.astroUnit;
            nextProps['labCatalog'] = option.demo.catalog;
          }
          this.setBlockProps(blockInstanceId, nextProps);
          return;
        }
      }

      if (isVeilHeroLabLayout(option.id)) {
        const nextProps: Record<string, unknown> = {
          ...veilHeroLabPreviewProps(option.id, block.props),
          labLayout: option.id,
        };
        if (option.demo) {
          nextProps['labUnit'] = option.demo.astroUnit;
          nextProps['labCatalog'] = option.demo.catalog;
        }
        this.setBlockProps(blockInstanceId, nextProps);
        return;
      }

      if (!isBaselineApprovedHeroLayout(option.id)) {
        const previewImage = option.previewImage ?? heroPreviewImageForLayout(option.id);
        if (previewImage) {
          Object.assign(patch, heroImageToProps(previewImage));
        }
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

  homepagePage(): BuildBookPage | null {
    return findPageByKind(this._pages(), 'homepage') ?? null;
  }

  homepagePageId(): string | null {
    return this.homepagePage()?.id ?? null;
  }

  landingPages(): BuildBookPage[] {
    return this._pages().filter((page) => page.kind === 'landing-page');
  }

  blogPosts(): BuildBookPage[] {
    return this._pages().filter((page) => page.kind === 'blog-post');
  }

  /** Reusable presentation stacks (2–3 per site). */
  blogTemplateProfiles(): BuildBookPage[] {
    return this.blogPosts().filter((page) => this.isTemplateProfile(page));
  }

  /** Article instance pages (linked or unbound drafts — not template profiles). */
  blogArticlePages(): BuildBookPage[] {
    return this.blogPosts().filter((page) => !this.isTemplateProfile(page));
  }

  isTemplateProfile(page: BuildBookPage): boolean {
    return page.role === 'template-profile';
  }

  blogHomePage(): BuildBookPage | null {
    return findPageByKind(this._pages(), 'blog-home') ?? null;
  }

  blogHomePageId(): string | null {
    return this.blogHomePage()?.id ?? null;
  }

  /** Singleton blog index page — creates editorial magazine seed when missing. */
  ensureBlogHomePage(): BuildBookPage {
    const existing = this.blogHomePage();
    if (existing) return existing;

    const pages = structuredClone(this._pages());
    const nextPage: BuildBookPage = {
      id: 'blog-home',
      kind: 'blog-home',
      label: 'Blog',
      slug: 'blog',
      blocks: [],
    };
    pages.push(nextPage);
    this.commitPageStructure(pages);

    const seedBlockIds = this.resolveBlogHomeSeedBlockIds();
    for (const blockId of seedBlockIds) {
      this.addPageBlock('blog-home', blockId);
    }

    return findPageById(this._pages(), 'blog-home') ?? nextPage;
  }

  private resolveBlogHomeSeedBlockIds(): string[] {
    const templateId = this._selectedTemplateId();
    const patternIds = [
      'blog-masthead',
      'blog-magazine-split',
      'blog-topic-bar',
      'blog-post-grid',
      'cta-banner',
    ] as const;
    const preferredBlockIds: Record<(typeof patternIds)[number], string> = {
      'blog-masthead': 'universal-blog-masthead-centered',
      'blog-magazine-split': 'universal-blog-magazine-split',
      'blog-topic-bar': 'universal-blog-topic-bar',
      'blog-post-grid': 'universal-blog-grid-list',
      'cta-banner': 'universal-cta-band',
    };
    const blockIds: string[] = [];

    for (const patternId of patternIds) {
      const variants = variantsForPattern(patternId, 'blog-home', templateId, 'compatible');
      const fallback = variantsForPattern(patternId, 'blog-home', templateId, 'all');
      const preferred = preferredBlockIds[patternId];
      const fromPreferred =
        variants.find((v) => v.id === preferred) ?? fallback.find((v) => v.id === preferred);
      const pick = fromPreferred ?? variants[0] ?? fallback[0];
      if (pick) blockIds.push(pick.id);
    }

    if (blockIds.length === 0) {
      return [
        'universal-blog-masthead-centered',
        'universal-blog-magazine-split',
        'universal-blog-topic-bar',
        'universal-blog-grid-list',
        'universal-cta-band',
      ];
    }
    return blockIds;
  }

  blocksForPage(pageId: string): BuildBookBlockInstance[] {
    return blocksForPageUtil(this._pages(), pageId);
  }

  reorderPageBlocks(pageId: string, fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const pages = structuredClone(this._pages());
    const page = findPageById(pages, pageId);
    if (!page) return;

    const blocks = [...page.blocks].sort((a, b) => a.order - b.order);
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= blocks.length ||
      toIndex >= blocks.length
    ) {
      return;
    }

    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    page.blocks = blocks.map((block, order) => ({ ...block, order }));
    this.commitPageStructure(pages);
  }

  reorderHomepageBlocks(fromIndex: number, toIndex: number): void {
    const pageId = this.homepagePageId();
    if (!pageId) return;
    this.reorderPageBlocks(pageId, fromIndex, toIndex);
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

  addPageBlock(pageId: string, blockId: string, insertAt?: number): void {
    const definition = findBuildBookBlockDefinition(blockId);
    if (!definition) return;

    const pages = structuredClone(this._pages());
    const page = findPageById(pages, pageId);
    if (!page) return;

    const blocks = [...page.blocks].sort((a, b) => a.order - b.order);
    const existingCount = blocks.filter((block) => block.blockId === blockId).length;
    const prefix = page.kind === 'homepage' ? 'home' : page.kind.replace(/-/g, '');
    const nextBlock: BuildBookBlockInstance = {
      id: `${prefix}-${blockId}-${existingCount + 1}`,
      blockId,
      section: definition.section,
      componentId: definition.componentId,
      label: definition.label,
      order: blocks.length,
      props: this.materializeBlockPropsForPage(blockId, pageId),
      sourceTemplateId: definition.sourceTemplateId ?? this._selectedTemplateId() ?? undefined,
      patternId: resolvePatternIdForBlock(blockId),
    };

    const insertIndex =
      insertAt == null || insertAt < 0 ? blocks.length : Math.min(insertAt, blocks.length);
    blocks.splice(insertIndex, 0, nextBlock);
    page.blocks = blocks.map((block, order) => ({ ...block, order }));
    this.commitPageStructure(pages);
  }

  addHomepageBlock(blockId: string, insertAfterIndex?: number): void {
    const pageId = this.homepagePageId();
    if (!pageId) return;
    const insertAt =
      insertAfterIndex == null || insertAfterIndex < 0
        ? undefined
        : insertAfterIndex + 1;
    this.addPageBlock(pageId, blockId, insertAt);
  }

  removePageBlock(pageId: string, blockInstanceId: string): void {
    const block = findPageBlockById(this._pages(), blockInstanceId);
    if (!block) return;
    if (isPinnedBaselineBlockId(block.blockId)) return;

    const pages = structuredClone(this._pages());
    const page = findPageById(pages, pageId);
    if (!page) return;

    page.blocks = page.blocks
      .filter((item) => item.id !== blockInstanceId)
      .sort((a, b) => a.order - b.order)
      .map((item, order) => ({ ...item, order }));
    this.commitPageStructure(pages);
  }

  removeHomepageBlock(blockInstanceId: string): void {
    const pageId = this.homepagePageId();
    if (!pageId) return;
    this.removePageBlock(pageId, blockInstanceId);
  }

  createLandingPage(label: string): BuildBookPage | null {
    const pages = structuredClone(this._pages());
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const base = slug || 'landing-page';
    let id = `landing-${base}`;
    let n = 1;
    while (pages.some((page) => page.id === id)) {
      n += 1;
      id = `landing-${base}-${n}`;
    }

    const nextPage: BuildBookPage = {
      id,
      kind: 'landing-page',
      label: label.trim() || 'Landing page',
      slug: base,
      blocks: [],
    };
    pages.push(nextPage);
    this.commitPageStructure(pages);
    return nextPage;
  }

  createBlogPostPage(
    label: string,
    links?: {
      contentPostId?: string;
      contentPlanItemKey?: string;
      suggestedKeyword?: string;
      briefBody?: string;
      role?: BuildBookPage['role'];
      templateProfileMeta?: BuildBookPage['templateProfileMeta'];
      seedSlots?: ReadonlyArray<{ patternId: string; preferredBlockId: string }>;
    },
  ): BuildBookPage | null {
    const pages = structuredClone(this._pages());
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const base = slug || 'blog-post';
    let id = `blog-${base}`;
    let n = 1;
    while (pages.some((page) => page.id === id)) {
      n += 1;
      id = `blog-${base}-${n}`;
    }

    const isProfile = links?.role === 'template-profile';
    const nextPage: BuildBookPage = {
      id,
      kind: 'blog-post',
      label: label.trim() || (isProfile ? 'Blog template' : 'Blog post'),
      slug: base,
      role: links?.role ?? (links?.contentPostId ? 'article' : undefined),
      templateProfileMeta: links?.templateProfileMeta,
      contentPostId: isProfile ? undefined : links?.contentPostId,
      contentPlanItemKey: isProfile ? undefined : links?.contentPlanItemKey,
      suggestedKeyword: isProfile ? undefined : links?.suggestedKeyword,
      blocks: [],
    };
    pages.push(nextPage);
    this.commitPageStructure(pages);

    const seedBlockIds = this.resolveBlogSeedBlockIds(links?.seedSlots);
    for (const blockId of seedBlockIds) {
      this.addPageBlock(id, blockId);
    }

    if (!isProfile && (links?.suggestedKeyword || links?.briefBody || links?.contentPlanItemKey)) {
      this.seedBlogPostCopyFromPlan(id, {
        title: nextPage.label,
        keyword: links.suggestedKeyword,
      });
    }

    return findPageById(this._pages(), id) ?? nextPage;
  }

  /**
   * Ensure this site has 2–3 named blog template profiles for generation variety.
   * Idempotent — does not duplicate existing varietyKeys.
   */
  ensureBlogTemplateProfiles(): BuildBookPage[] {
    if (!this.hasDraft()) return [];

    const defs: ReadonlyArray<{
      varietyKey: NonNullable<BuildBookPage['templateProfileMeta']>['varietyKey'];
      label: string;
      seedSlots: ReadonlyArray<{ patternId: string; preferredBlockId: string }>;
    }> = [
      {
        varietyKey: 'editorial-split',
        label: 'Editorial split',
        seedSlots: [
          { patternId: 'section-intro', preferredBlockId: 'universal-intro-centered' },
          { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
          { patternId: 'content-split', preferredBlockId: 'universal-split-image-right' },
          { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
          { patternId: 'content-split', preferredBlockId: 'universal-split-image-left' },
          { patternId: 'faq-accordion', preferredBlockId: 'universal-faq-accordion' },
          { patternId: 'cta-banner', preferredBlockId: 'universal-cta-band' },
        ],
      },
      {
        varietyKey: 'proof-heavy',
        label: 'Proof-heavy',
        seedSlots: [
          { patternId: 'section-intro', preferredBlockId: 'universal-intro-centered' },
          { patternId: 'content-split', preferredBlockId: 'universal-split-image-right' },
          { patternId: 'content-split', preferredBlockId: 'universal-split-image-left' },
          { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
          { patternId: 'content-split', preferredBlockId: 'universal-split-image-right' },
          { patternId: 'cta-banner', preferredBlockId: 'universal-cta-band' },
        ],
      },
      {
        varietyKey: 'faq-led',
        label: 'FAQ-led',
        seedSlots: [
          { patternId: 'section-intro', preferredBlockId: 'universal-intro-centered' },
          { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
          { patternId: 'faq-accordion', preferredBlockId: 'universal-faq-accordion' },
          { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
          { patternId: 'content-split', preferredBlockId: 'universal-split-image-right' },
          { patternId: 'cta-banner', preferredBlockId: 'universal-cta-band' },
        ],
      },
    ];

    const existing = this.blogTemplateProfiles();
    const have = new Set(
      existing
        .map((p) => p.templateProfileMeta?.varietyKey)
        .filter((k): k is NonNullable<typeof k> => Boolean(k)),
    );

    for (const def of defs) {
      if (have.has(def.varietyKey)) continue;
      // Cap at 3 profiles total.
      if (this.blogTemplateProfiles().length >= 3) break;
      this.createBlogPostPage(def.label, {
        role: 'template-profile',
        templateProfileMeta: { varietyKey: def.varietyKey },
        seedSlots: def.seedSlots,
      });
      have.add(def.varietyKey);
    }

    return this.blogTemplateProfiles();
  }

  /**
   * Clone a template profile stack onto an article page (or create the page),
   * then leave fill to applyArticleFillToBlogPage.
   */
  cloneTemplateProfileOntoArticlePage(
    profilePageId: string,
    contentPostId: string,
    label: string,
    links?: { contentPlanItemKey?: string; suggestedKeyword?: string },
  ): BuildBookPage | null {
    const profile = findPageById(this._pages(), profilePageId);
    if (!profile || profile.kind !== 'blog-post' || !this.isTemplateProfile(profile)) {
      return this.ensureBlogPostForContentPost(contentPostId, label, links);
    }

    const existing = this.findBlogPostByContentPostId(contentPostId);
    if (existing) {
      const pages = structuredClone(this._pages());
      const page = findPageById(pages, existing.id);
      if (!page) return existing;
      page.role = 'article';
      page.label = label.trim() || page.label;
      page.blocks = structuredClone(profile.blocks).map((block, index) => ({
        ...block,
        id: `${page.id}-b${index + 1}`,
      }));
      if (links?.contentPlanItemKey) page.contentPlanItemKey = links.contentPlanItemKey;
      if (links?.suggestedKeyword) page.suggestedKeyword = links.suggestedKeyword;
      this.commitPageStructure(pages);
      return findPageById(this._pages(), page.id) ?? page;
    }

    const pages = structuredClone(this._pages());
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const base = slug || 'blog-post';
    let id = `blog-${base}`;
    let n = 1;
    while (pages.some((page) => page.id === id)) {
      n += 1;
      id = `blog-${base}-${n}`;
    }
    const nextPage: BuildBookPage = {
      id,
      kind: 'blog-post',
      label: label.trim() || 'Blog post',
      slug: base,
      role: 'article',
      contentPostId,
      contentPlanItemKey: links?.contentPlanItemKey,
      suggestedKeyword: links?.suggestedKeyword,
      blocks: structuredClone(profile.blocks).map((block, index) => ({
        ...block,
        id: `${id}-b${index + 1}`,
      })),
    };
    pages.push(nextPage);
    this.commitPageStructure(pages);
    return findPageById(this._pages(), id) ?? nextPage;
  }

  /** Find an existing blog page linked to a content-plan calendar row. */
  findBlogPostByPlanItemKey(itemKey: string): BuildBookPage | null {
    return (
      this._pages().find(
        (page) => page.kind === 'blog-post' && page.contentPlanItemKey === itemKey,
      ) ?? null
    );
  }

  /** Find a blog-post page linked to a portable content post. */
  findBlogPostByContentPostId(contentPostId: string): BuildBookPage | null {
    const id = contentPostId.trim();
    if (!id) return null;
    return (
      this._pages().find((page) => page.kind === 'blog-post' && page.contentPostId === id) ?? null
    );
  }

  /**
   * Ensure a blog-post page exists for a content post (creates default beautiful stack if missing).
   */
  ensureBlogPostForContentPost(
    contentPostId: string,
    label: string,
    links?: { contentPlanItemKey?: string; suggestedKeyword?: string },
  ): BuildBookPage | null {
    const existing = this.findBlogPostByContentPostId(contentPostId);
    if (existing) return existing;
    return this.createBlogPostPage(label.trim() || 'Blog post', {
      contentPostId,
      contentPlanItemKey: links?.contentPlanItemKey,
      suggestedKeyword: links?.suggestedKeyword,
    });
  }

  /**
   * Replace a blog-post page stack with the default beautiful template
   * (intro → prose → image-right → prose → image-left → FAQ → CTA).
   */
  resetBlogPostToDefaultTemplate(pageId: string): BuildBookPage | null {
    const pages = structuredClone(this._pages());
    const page = findPageById(pages, pageId);
    if (!page || page.kind !== 'blog-post') return null;

    const label = page.label;
    const keyword = page.suggestedKeyword;
    page.blocks = [];
    this.commitPageStructure(pages);

    for (const blockId of this.resolveBlogSeedBlockIds()) {
      this.addPageBlock(pageId, blockId);
    }
    this.seedBlogPostCopyFromPlan(pageId, { title: label, keyword });
    return findPageById(this._pages(), pageId) ?? null;
  }

  /**
   * Persist generated article copy onto the linked blog-post profile blocks.
   * Returns true when props changed.
   */
  applyArticleFillToBlogPage(
    pageId: string,
    source: BlogArticleFillSource,
  ): boolean {
    const pages = structuredClone(this._pages());
    const page = findPageById(pages, pageId);
    if (!page || page.kind !== 'blog-post') return false;

    const nextBlocks = fillBlogPostBlockProps(page.blocks, source);
    const changed = nextBlocks.some((block, index) => {
      const prev = page.blocks[index];
      return JSON.stringify(prev?.props ?? {}) !== JSON.stringify(block.props ?? {});
    });
    if (!changed) return false;

    page.blocks = nextBlocks;
    this.commitPageStructure(pages);
    return true;
  }

  private seedBlogPostCopyFromPlan(
    pageId: string,
    seed: { title: string; keyword?: string },
  ): void {
    const pages = structuredClone(this._pages());
    const page = findPageById(pages, pageId);
    if (!page) return;

    const kicker = seed.keyword?.trim() || 'Article';
    const heading = seed.title.trim();
    const placeholder =
      'Article copy will appear here after generation.';
    let bodySeeded = false;

    for (const block of page.blocks) {
      const patternId = block.patternId ?? '';
      const props = structuredClone(block.props ?? {});
      const isCopyBlock =
        patternId === 'section-intro' ||
        patternId === 'prose-band' ||
        patternId === 'content-split';

      if (isCopyBlock) {
        if (typeof props['kicker'] === 'string') props['kicker'] = kicker;
        if (typeof props['heading'] === 'string') props['heading'] = heading;
        if (typeof props['eyebrow'] === 'string') props['eyebrow'] = kicker;
        if (typeof props['title'] === 'string') props['title'] = heading;
      }
      // Never paste the plan brief into bodies — placeholder on first intro/prose only.
      if (
        !bodySeeded &&
        typeof props['body'] === 'string' &&
        (patternId === 'section-intro' || patternId === 'prose-band')
      ) {
        props['body'] = placeholder;
        bodySeeded = true;
      }
      block.props = props;
    }

    this.commitPageStructure(pages);
  }

  private resolveBlogSeedBlockIds(
    seedSlots?: ReadonlyArray<{ patternId: string; preferredBlockId: string }>,
  ): string[] {
    const templateId = this._selectedTemplateId();
    const slots: ReadonlyArray<{ patternId: string; preferredBlockId: string }> = seedSlots ?? [
      { patternId: 'section-intro', preferredBlockId: 'universal-intro-centered' },
      { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
      { patternId: 'content-split', preferredBlockId: 'universal-split-image-right' },
      { patternId: 'prose-band', preferredBlockId: 'universal-prose-band' },
      { patternId: 'content-split', preferredBlockId: 'universal-split-image-left' },
      { patternId: 'faq-accordion', preferredBlockId: 'universal-faq-accordion' },
      { patternId: 'cta-banner', preferredBlockId: 'universal-cta-band' },
    ];
    const blockIds: string[] = [];

    for (const slot of slots) {
      const variants = variantsForPattern(slot.patternId, 'blog-post', templateId, 'compatible');
      const fallback = variantsForPattern(slot.patternId, 'blog-post', templateId, 'all');
      const fromPreferred =
        variants.find((v) => v.id === slot.preferredBlockId) ??
        fallback.find((v) => v.id === slot.preferredBlockId);
      const universalPick =
        variants.find((v) => v.id.startsWith('universal-')) ??
        fallback.find((v) => v.id.startsWith('universal-'));
      const pick = fromPreferred ?? universalPick ?? variants[0] ?? fallback[0];
      if (pick) blockIds.push(pick.id);
    }

    if (blockIds.length === 0) {
      return slots.map((s) => s.preferredBlockId);
    }
    return blockIds;
  }

  private patchNonHomepageBlockProps(
    blockInstanceId: string,
    updater: (props: Record<string, unknown>) => Record<string, unknown>,
  ): void {
    const pages = structuredClone(this._pages());
    const page = findPageContainingBlock(pages, blockInstanceId);
    if (!page || page.kind === 'homepage') return;

    const block = page.blocks.find(
      (item) => item.id === blockInstanceId || item.blockId === blockInstanceId,
    );
    if (!block) return;

    block.props = updater(structuredClone(block.props ?? {}));
    this.commitPageStructure(pages);
  }

  private commitPageStructure(nextPages: BuildBookPage[]): void {
    const templateId = this.resolveTemplateIdForCommit();
    const draft = draftFromBuildBookPages(templateId, nextPages);
    this._pages.set(structuredClone(nextPages));
    this._draft.set(draft);
    this._dirty.set(true);
  }

  /** Prefer explicit selection, then hosted-pilot slug map — never invent WRI for other sites. */
  private resolveTemplateIdForCommit(): string {
    return (
      this._selectedTemplateId() ??
      buildBookTemplateIdForSlug(this.strategy.site()?.clientSitesSlug) ??
      ''
    );
  }

  private commitHomepageStructure(nextPages: BuildBookPage[]): void {
    this.commitPageStructure(nextPages);
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
      this._siteTheme.set(null);
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
    const pendingTheme = this._siteTheme();
    this._prospectContext.set(book.prospectContext ? { ...book.prospectContext } : null);
    this._entryMode.set(book.entryMode);
    this._selectedTemplateId.set(book.selectedTemplateId ?? null);
    const incomingTheme = book.siteTheme ? structuredClone(book.siteTheme) : null;
    if (
      incomingTheme &&
      pendingTheme?.typographyOverride &&
      !incomingTheme.typographyOverride
    ) {
      incomingTheme.typographyOverride = structuredClone(pendingTheme.typographyOverride);
    }
    this._siteTheme.set(incomingTheme);
    this._pages.set(book.pages?.length ? backfillPatternIdsOnPages(structuredClone(book.pages)) : []);
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
      siteTheme: this._siteTheme() ?? undefined,
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
      pages: backfillPatternIdsOnPages(pages),
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
