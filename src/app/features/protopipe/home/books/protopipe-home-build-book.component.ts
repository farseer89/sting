import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ProtopipeBuildBookService, findDraftSectionForSlot } from '../../build-book/protopipe-build-book.service';
import { findBuildBookBlockDefinition } from '../../build-book/build-book-block.catalog';
import {
  baselineVariantLabel,
  isBaselineHomepage,
} from '../../build-book/build-book-baseline.util';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  BUILD_BOOK_OPTIONS,
  BUILD_BOOK_SECTION_ORDER,
  buildBookSectionLabel,
  buildBookSectionNum,
  findBuildBookOption,
  type BuildBookOption,
  type BuildBookSection,
} from '../../build-book/build-book.constants';
import {
  BUILD_DEMO_HERO_VARIANTS,
  brandsForDemoSection,
  demoBrandDot,
  demoBrandLabel,
  filterDemoOptions,
  isDemoSection as isBuildBookDemoSection,
} from '../../build-book/build-book-demo.catalog';
import { baselineApprovedHeroOptionsForBrand } from '../../build-book/build-book-baseline-hero.catalog';
import {
  BASELINE_APPROVED_FOLD_LIBRARY,
  resolveBaselineFoldLayoutId,
} from '../../build-book/build-book-baseline-fold.catalog';
import type { BuildBookDemoBrand, BuildBookTemplateDefinition } from '../../build-book/build-book.types';
import { ProtopipeBuildSiteImagesPanelComponent } from '../../build-book/build-site-images-panel/protopipe-build-site-images-panel.component';
import { ProtopipeBuildImageQuickPickerComponent } from '../../build-book/image-picker/build-image-quick-picker.component';
import { ProtopipeBuildBlockNavThumbComponent } from '../../build-book/nav-thumb/build-block-nav-thumb.component';
import { ProtopipeBuildBookOptionPreviewComponent } from '../../build-book/option-preview/protopipe-build-book-option-preview.component';
import {
  ProtopipeBuildPageCanvasComponent,
  type BuildPageBlockState,
  type BuildPageSectionState,
} from '../../build-book/canvas/build-page-canvas.component';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../../build-book/build-hero-preview.types';
import { readHeroCopy, readHeroImageUrl, resolveHeroPreviewLayoutId, heroCopyToProps } from '../../build-book/build-hero-block.util';
import { resolveBaselineHeroLayoutId } from '../../build-book/build-book-baseline-hero.catalog';
import type { BuildBookProspectContext } from '../../build-book/build-book-context';
import { BUILD_BOOK_TEMPLATE_DEFINITIONS } from '../../build-book/build-book-template.catalog';
import { WRI_BASELINE_BLOCK_DEFINITIONS } from '../../build-book/build-book-baseline-block.catalog';
import { SPARKY_BASELINE_BLOCK_DEFINITIONS } from '../../build-book/build-book-sparky-baseline-block.catalog';
import { WILCO_BASELINE_BLOCK_DEFINITIONS } from '../../build-book/build-book-wilco-baseline-block.catalog';
import { baselineNavEntriesFromBlocks } from '../../build-book/build-book-baseline-nav.util';
import { hasBuildBookBaselineAssembly } from '../../build-book/build-book-baseline-assemblies';
import { hrefFieldsFromProps, altFieldsFromProps } from '../../build-book/fields/build-href-field.util';
import { readProp } from '../../build-book/fields/build-field.util';
import type { BuildPageImageEditEvent } from '../../build-book/canvas/build-page-canvas.component';

const SECTION_DECK: Record<BuildBookSection, string> = {
  hero: 'Pick a hero layout, then open Hero images & copy to generate photos and set headline text — same live preview as pitch prep.',
  fold: 'Below-the-fold sections from the Sparky and WRI style labs — contract bars, capabilities, proof, and close patterns.',
  services: 'How service lines are organized on the homepage.',
  proof: 'Social proof — reviews, outcomes, or a single quote highlight.',
  areas: 'Coverage and process — FAQ accordion or how-it-works steps.',
  close: 'Final conversion — CTA banner or lead capture form.',
};

const HERO_PREVIEW_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop offset="0" stop-color="%230f766e"/%3E%3Cstop offset="0.52" stop-color="%23164e63"/%3E%3Cstop offset="1" stop-color="%230f172a"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="1600" height="1000" fill="url(%23g)"/%3E%3Cpath d="M0 690c180-72 343-101 489-86 171 18 274 89 436 82 182-8 301-111 675-137v451H0z" fill="%23020617" opacity=".38"/%3E%3C/svg%3E';

type BuildBookEntryMode = 'template' | 'blocks';
type BuildBookChapter =
  | 'templates'
  | 'site-info-images'
  | 'homepage'
  | 'landing-pages'
  | 'blog-posts'
  | 'review-gate'
  | 'lead-form'
  | 'checklist';

interface BuildBookChapterItem {
  id: BuildBookChapter;
  label: string;
  group: string;
  status?: string;
}

@Component({
  selector: 'app-protopipe-home-build-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    Button,
    Message,
    ProgressSpinner,
    CdkDropList,
    CdkDrag,
    ProtopipeBuildPageCanvasComponent,
    ProtopipeBuildSiteImagesPanelComponent,
    ProtopipeBuildImageQuickPickerComponent,
    ProtopipeBuildBlockNavThumbComponent,
    ProtopipeBuildBookOptionPreviewComponent,
  ],
  templateUrl: './protopipe-home-build-book.component.html',
  styleUrl: './protopipe-home-build-book.component.scss',
})
export class ProtopipeHomeBuildBookComponent implements OnInit {
  readonly prospectContext = input<BuildBookProspectContext | null>(null);
  readonly exit = output<void>();

  readonly buildBook = inject(ProtopipeBuildBookService);
  readonly strategy = inject(ProtopipeStrategyService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly section = signal<BuildBookSection>('hero');
  readonly chapter = signal<BuildBookChapter>('templates');
  readonly entryMode = signal<BuildBookEntryMode>('template');
  readonly demoBrand = signal<BuildBookDemoBrand>('sparky');
  readonly previewOpen = signal(true);
  readonly previewWidth = signal(260);
  readonly heroPreviewIndex = signal(0);
  readonly scrollToSection = signal<BuildBookSection | null>(null);
  readonly activeBlockId = signal<string | null>(null);
  readonly scrollToBlockId = signal<string | null>(null);
  readonly pendingImageEdit = signal<{ blockInstanceId: string; propPath: string } | null>(null);
  readonly imagePickerOpen = signal(false);
  readonly addBlockDialogOpen = signal(false);

  readonly baselineCatalogBlocks = computed(() => {
    const templateId = this.buildBook.selectedTemplateId();
    if (templateId === 'sparky-electric-trades-v1') {
      return SPARKY_BASELINE_BLOCK_DEFINITIONS;
    }
    if (templateId === 'wilco-consulting-v1') {
      return WILCO_BASELINE_BLOCK_DEFINITIONS;
    }
    return WRI_BASELINE_BLOCK_DEFINITIONS;
  });

  readonly baselineNavEntries = computed(() => baselineNavEntriesFromBlocks(this.baselineBlocks()));

  readonly navSlots: BuildBookSection[] = [
    'hero',
    'fold',
    'services',
    'proof',
    'areas',
    'close',
  ];

  readonly chapters: BuildBookChapterItem[] = [
    { id: 'templates', label: 'Templates', group: 'Design' },
    { id: 'site-info-images', label: 'Site Info & Images', group: 'Design' },
    { id: 'homepage', label: 'Homepage', group: 'Build' },
    { id: 'landing-pages', label: 'Landing pages', group: 'Build', status: 'planned' },
    { id: 'blog-posts', label: 'Blog posts', group: 'Demo package', status: 'planned' },
    { id: 'review-gate', label: 'Review gate', group: 'Demo package', status: 'planned' },
    { id: 'lead-form', label: 'Lead form', group: 'Demo package', status: 'planned' },
    { id: 'checklist', label: 'Demo checklist', group: 'Launch', status: 'planned' },
  ];

  readonly chapterGroups = [...new Set(this.chapters.map((chapter) => chapter.group))];

  readonly heroLayoutId = computed(() => {
    if (this.isBaselineMode()) {
      const block =
        this.activeBlock()?.section === 'hero'
          ? this.activeBlock()
          : this.baselineBlocks().find((item) => item.section === 'hero');
      if (block) {
        return resolveBaselineHeroLayoutId(block.blockId, block.props);
      }
    }

    const hero = this.heroSection();
    return resolveHeroPreviewLayoutId(this.selectedId('hero'), hero);
  });

  readonly heroPreviewMeta = computed(
    () => BUILD_DEMO_HERO_VARIANTS.find((h) => h.id === this.heroLayoutId()) ?? BUILD_DEMO_HERO_VARIANTS[0],
  );

  readonly heroPreviewBrand = computed(
    (): BuildBookDemoBrand => this.heroPreviewMeta()?.brand ?? this.demoBrand(),
  );

  readonly configuredStackCount = computed(() => {
    if (this.isBaselineMode()) {
      return this.buildBook.homepageBlocks().length;
    }
    return this.navSlots.filter((slot) => Boolean(this.selectedId(slot))).length;
  });

  readonly isBaselineMode = computed(() => isBaselineHomepage(this.buildBook.pages()));

  readonly baselineBlocks = computed(() => this.buildBook.homepageBlocks());

  readonly baselineVariantLabel = computed(() => {
    const hero = this.baselineBlocks()[0];
    return hero ? baselineVariantLabel(hero.props) : null;
  });

  readonly activeBlock = computed(() => {
    const id = this.activeBlockId();
    if (!id) return this.baselineBlocks()[0] ?? null;
    return this.baselineBlocks().find((block) => block.id === id) ?? null;
  });

  readonly activeBlockDefinition = computed(() => {
    const block = this.activeBlock();
    return block ? findBuildBookBlockDefinition(block.blockId) : null;
  });

  readonly activeHrefFields = computed(() => {
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      const def = this.activeBlockDefinition();
      if (!block || !def) return [];
      return hrefFieldsFromProps(block.props, def.editableFields);
    }

    const props = this.buildBook.sectionProps(this.section());
    const optionId = this.selectedId(this.section());
    const option = optionId ? findBuildBookOption(this.section(), optionId) : undefined;
    const defaults = option ? findBuildBookBlockDefinition(option.id) : undefined;
    if (!props || !defaults) return [];
    return hrefFieldsFromProps(props, defaults.editableFields);
  });

  readonly activeAltFields = computed(() => {
    if (!this.isBaselineMode()) return [];
    const block = this.activeBlock();
    const def = this.activeBlockDefinition();
    if (!block || !def) return [];
    return altFieldsFromProps(block.props, def.editableFields);
  });

  readonly activeImageEditUrl = computed(() => {
    const pending = this.pendingImageEdit();
    if (pending) {
      const props = this.buildBook.blockProps(pending.blockInstanceId);
      if (!props) return null;
      const url = readProp(props, pending.propPath);
      return typeof url === 'string' ? url : null;
    }
    return this.activeHeroImageUrl();
  });

  readonly imageEditHint = computed(() => {
    const pending = this.pendingImageEdit();
    if (!pending) return 'Choose or generate a hero image for the live preview.';
    if (pending.propPath === 'imageSrc') return 'Choose or generate a featured well photo.';
    if (pending.propPath.startsWith('capabilities.')) return 'Choose a capability card photo.';
    if (pending.propPath.startsWith('gallery.')) return 'Choose a gallery photo.';
    return 'Choose or generate a hero background image.';
  });

  readonly imagePickerTitle = computed(() => {
    const pending = this.pendingImageEdit();
    if (pending?.propPath === 'imageSrc') return 'Choose featured well photo';
    if (pending?.propPath === 'backgroundImageSrc') return 'Choose hero background';
    if (pending?.propPath.startsWith('capabilities.')) return 'Choose capability photo';
    if (pending?.propPath.startsWith('gallery.')) return 'Choose gallery photo';
    return 'Choose an image';
  });

  readonly starterTemplates = BUILD_BOOK_TEMPLATE_DEFINITIONS;

  readonly activeProspectContext = computed(
    () => this.prospectContext() ?? this.buildBook.prospectContext(),
  );

  readonly title = computed(() => {
    const prospect = this.activeProspectContext();
    return prospect ? `Build demo for ${prospect.name}` : 'Build book';
  });

  readonly deck = computed(() => {
    const prospect = this.activeProspectContext();
    if (!prospect) {
      return 'Shire-ready site design workspace — start from a template, refine blocks, and prepare the homepage stack.';
    }
    const area = prospect.area ? ` in ${prospect.area}` : '';
    return `Create a tailored demo page for this ${prospect.category ?? 'business'}${area}, using template structure now and Shire build-book state later.`;
  });

  readonly contextSignal = computed(() => {
    const prospect = this.activeProspectContext();
    if (!prospect) return this.siteLabel();
    return prospect.topSignal ?? this.websiteStatusLabel(prospect.websiteStatus);
  });

  readonly activeChapterMeta = computed(() =>
    this.chapters.find((chapter) => chapter.id === this.chapter()) ?? this.chapters[0],
  );

  readonly selectedTemplateId = computed(() => this.buildBook.selectedTemplateId());
  readonly selectedTemplate = computed(() =>
    this.starterTemplates.find((template) => template.id === this.selectedTemplateId()) ?? null,
  );
  readonly selectedTemplatePreviewUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.blockAssemblyPreviewUrl() ?? this.selectedTemplate()?.previewUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  readonly heroSection = computed(() => {
    const draft = this.buildBook.draft();
    if (!draft) return null;
    return findDraftSectionForSlot(draft, 'hero');
  });
  readonly heroCopy = computed(() => {
    const props = this.heroSection()?.props;
    return props ? readHeroCopy(props) : DEFAULT_HERO_PREVIEW_COPY;
  });
  readonly activeHeroImageUrl = computed(() => {
    if (this.isBaselineMode()) {
      const block =
        this.activeBlock()?.section === 'hero'
          ? this.activeBlock()
          : this.baselineBlocks().find((item) => item.section === 'hero');
      if (block) return readHeroImageUrl(block.props);
    }

    const props = this.heroSection()?.props;
    return props ? readHeroImageUrl(props) : null;
  });

  readonly baselineHeroPhotoDrifted = computed(() => {
    const block = this.activeBlock();
    if (!this.isBaselineMode() || block?.section !== 'hero') return false;

    const def = findBuildBookBlockDefinition(block.blockId);
    if (!def) return false;

    const current = readHeroImageUrl(block.props);
    const template = readHeroImageUrl(def.defaultProps);
    if (!current || !template) return false;
    return current !== template;
  });
  readonly activeHeroImageCss = computed(() => {
    const url = this.activeHeroImageUrl();
    return url ? `url(${JSON.stringify(url)})` : null;
  });
  readonly heroPreviewImageUrl = computed(
    () => this.activeHeroImageUrl() ?? HERO_PREVIEW_PLACEHOLDER_IMAGE,
  );
  readonly blockAssemblyCount = computed(
    () => this.buildBook.pages().find((page) => page.kind === 'homepage')?.blocks.length ?? 0,
  );
  readonly pageSectionStates = computed((): BuildPageSectionState[] => {
    const draft = this.buildBook.draft();
    return BUILD_BOOK_SECTION_ORDER.map((section) => {
      const optionId = this.selectedId(section);
      const option = optionId ? findBuildBookOption(section, optionId) : undefined;
      const draftSection = draft ? findDraftSectionForSlot(draft, section) : null;
      return {
        section,
        blockId: optionId,
        layout: option?.layout ?? 'grid',
        props: structuredClone(draftSection?.props ?? {}),
        configured: Boolean(optionId && draftSection),
      };
    });
  });

  readonly pageBlockStates = computed((): BuildPageBlockState[] =>
    this.baselineBlocks().map((block) => ({
      id: block.id,
      blockId: block.blockId,
      section: block.section,
      label: block.label ?? block.blockId,
      layout: findBuildBookBlockDefinition(block.blockId)?.layout ?? 'grid',
      props: structuredClone(block.props),
      configured: true,
    })),
  );

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.buildBook.load();
    this.entryMode.set(this.buildBook.entryMode());
    const prospect = this.prospectContext();
    if (prospect) this.buildBook.setProspectContext(prospect);
    const draft = this.buildBook.draft();
    if (draft) {
      this.syncHeroPreviewIndexFromDraft(draft);
      this.syncDemoBrandFromDraft(draft);
    }
    const site = this.strategy.site();
    if (site?.displayName && draft) {
      this.buildBook.seedHeroEyebrow(site.displayName);
    }
    this.restoreWorkflowFromUrl();
    if (this.isBaselineMode()) {
      const first = this.baselineBlocks()[0];
      if (first && !this.activeBlockId()) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      }
    }
  }

  private syncHeroPreviewIndexFromDraft(
    draft: NonNullable<ReturnType<typeof this.buildBook.draft>>,
  ): void {
    const heroSection = findDraftSectionForSlot(draft, 'hero');
    const layoutId = resolveHeroPreviewLayoutId(this.selectedId('hero'), heroSection);
    const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === layoutId);
    if (idx >= 0) this.heroPreviewIndex.set(idx);
  }

  private syncDemoBrandFromDraft(
    draft: NonNullable<ReturnType<typeof this.buildBook.draft>>,
  ): void {
    const heroSection = findDraftSectionForSlot(draft, 'hero');
    const labBrand = heroSection?.props['labBrand'];
    if (labBrand === 'sparky' || labBrand === 'wri' || labBrand === 'consult' || labBrand === 'veil') {
      this.demoBrand.set(labBrand);
      return;
    }

    const optionId = this.selectedId('hero');
    const option = optionId ? findBuildBookOption('hero', optionId) : undefined;
    if (option?.demo?.brand) {
      this.demoBrand.set(option.demo.brand);
    }
  }

  selectSection(id: BuildBookSection): void {
    if (this.isBaselineMode()) {
      const block = this.baselineBlocks().find((item) => item.section === id);
      if (block) {
        this.selectBlock(block.id);
        return;
      }
    }
    this.chapter.set('homepage');
    this.section.set(id);
    this.scrollToSection.set(id);
    this.syncWorkflowToUrl();
    if (isBuildBookDemoSection(id)) {
      this.syncDemoBrandForSection(id);
    }
    this.openPreview();
  }

  selectBlock(blockInstanceId: string): void {
    const block = this.baselineBlocks().find((item) => item.id === blockInstanceId);
    if (!block) return;
    this.chapter.set('homepage');
    this.activeBlockId.set(block.id);
    this.section.set(block.section);
    this.scrollToBlockId.set(block.id);
    this.syncWorkflowToUrl();
    this.openPreview();
  }

  private syncDemoBrandForSection(section: BuildBookSection): void {
    const optionId = this.selectedId(section);
    const option = optionId ? findBuildBookOption(section, optionId) : undefined;
    if (option?.demo?.brand) {
      this.demoBrand.set(option.demo.brand);
      return;
    }

    const props = this.buildBook.sectionProps(section);
    const labBrand = props?.['labBrand'];
    if (labBrand === 'sparky' || labBrand === 'wri' || labBrand === 'consult' || labBrand === 'veil') {
      this.demoBrand.set(labBrand);
      return;
    }

    const brands = brandsForDemoSection(section);
    if (!brands.includes(this.demoBrand())) {
      this.demoBrand.set(brands[0] ?? 'sparky');
    }
  }

  togglePreview(): void {
    this.previewOpen.update((open) => !open);
  }

  openPreview(): void {
    this.previewOpen.set(true);
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  setEntryMode(mode: BuildBookEntryMode): void {
    this.entryMode.set(mode);
    this.buildBook.setEntryMode(mode);
  }

  openSiteInfoImages(): void {
    this.chapter.set('site-info-images');
    this.syncWorkflowToUrl();
    this.closePreview();
  }

  onHeroCopyChange(copy: BuildHeroPreviewCopy): void {
    if (!this.buildBook.draft()) return;
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      if (block?.section === 'hero') {
        this.buildBook.updateBlockProps(block.id, heroCopyToProps(copy));
        return;
      }
    }
    this.buildBook.updateHeroCopy(copy);
  }

  onCanvasSectionClick(section: BuildBookSection): void {
    if (this.isBaselineMode()) return;
    if (this.section() === section) return;
    this.section.set(section);
    this.syncWorkflowToUrl();
  }

  onCanvasBlockClick(blockInstanceId: string): void {
    if (this.activeBlockId() === blockInstanceId) return;
    this.selectBlock(blockInstanceId);
  }

  onCanvasBlockPropPathChange(event: { blockId: string; path: string; value: unknown }): void {
    this.buildBook.updateBlockPropPath(event.blockId, event.path, event.value);
  }

  onCanvasBlockPropsChange(event: { blockId: string; props: Record<string, unknown> }): void {
    this.buildBook.setBlockProps(event.blockId, event.props);
  }

  onCanvasPropsChange(event: { section: BuildBookSection; props: Record<string, unknown> }): void {
    this.buildBook.setSectionProps(event.section, event.props);
  }

  onCanvasPropPathChange(event: { section: BuildBookSection; path: string; value: unknown }): void {
    this.buildBook.updateSectionPropPath(event.section, event.path, event.value);
  }

  onCanvasImageEdit(event: BuildPageImageEditEvent = {}): void {
    if (this.isBaselineMode() && event.blockId && event.propPath) {
      this.pendingImageEdit.set({ blockInstanceId: event.blockId, propPath: event.propPath });
      this.imagePickerOpen.set(true);
      return;
    }

    const heroBlockId = this.activeBlock()?.blockId;
    if (
      this.isBaselineMode() &&
      (heroBlockId === 'wri-baseline-hero-life-proof' ||
        heroBlockId === 'sparky-baseline-hero-callout' ||
        heroBlockId === 'wilco-baseline-hero-split')
    ) {
      const block = this.activeBlock();
      if (block) {
        this.pendingImageEdit.set({ blockInstanceId: block.id, propPath: 'backgroundImageSrc' });
        this.imagePickerOpen.set(true);
        return;
      }
    }

    this.pendingImageEdit.set(null);
    this.openSiteInfoImages();
  }

  closeImagePicker(): void {
    this.imagePickerOpen.set(false);
    this.pendingImageEdit.set(null);
  }

  async onImagePickerSelect(url: string): Promise<void> {
    this.imagePickerOpen.set(false);
    await this.onHeroImageSelected(url);
  }

  onImagePickerOpenLibrary(): void {
    this.imagePickerOpen.set(false);
    this.openSiteInfoImages();
  }

  updateActiveHref(key: string, value: string): void {
    if (this.isBaselineMode()) {
      const block = this.activeBlock();
      if (!block) return;
      if (key.includes('.')) {
        this.buildBook.updateBlockPropPath(block.id, key, value);
        return;
      }
      this.buildBook.updateBlockProps(block.id, { [key]: value });
      return;
    }
    this.buildBook.updateSectionProps(this.section(), { [key]: value });
  }

  updateActiveAlt(key: string, value: string): void {
    const block = this.activeBlock();
    if (!block) return;
    this.buildBook.updateBlockPropPath(block.id, key, value);
  }

  altPanelVisible(): boolean {
    return this.activeAltFields().length > 0;
  }

  hrefPanelVisible(): boolean {
    return this.activeHrefFields().length > 0;
  }

  addSectionStat(): void {
    const props = this.buildBook.sectionProps(this.section());
    const stats = Array.isArray(props?.['stats']) ? [...(props!['stats'] as unknown[])] : [];
    stats.push({ value: 'New stat', label: 'Label' });
    this.buildBook.updateSectionArray(this.section(), 'stats', stats);
  }

  addSectionListItem(key: 'items' | 'services' | 'testimonials'): void {
    const section = this.section();
    const props = this.buildBook.sectionProps(section);
    const arrayKey =
      section === 'areas'
        ? Array.isArray(props?.['items'])
          ? 'items'
          : 'steps'
        : key;
    const items = Array.isArray(props?.[arrayKey]) ? [...(props![arrayKey] as unknown[])] : [];
    if (arrayKey === 'services' || arrayKey === 'steps') {
      items.push(typeof items[0] === 'string' ? 'New service' : { title: 'New service', body: 'Description' });
    } else if (arrayKey === 'testimonials') {
      items.push({ quote: 'New review', name: 'Customer', role: 'Client' });
    } else {
      items.push({ question: 'New question', answer: 'Answer' });
    }
    this.buildBook.updateSectionArray(section, arrayKey, items);
  }

  structuralPanelVisible(): boolean {
    if (this.isBaselineMode()) {
      const blockId = this.activeBlock()?.blockId;
      return (
        blockId === 'wri-baseline-contract-bar' ||
        blockId === 'wri-baseline-capabilities-grid' ||
        blockId === 'wri-baseline-life-proof-split' ||
        blockId === 'wri-baseline-project-lifecycle' ||
        blockId === 'wri-baseline-regulatory-trust' ||
        blockId === 'wri-baseline-featured-well' ||
        blockId === 'wri-baseline-sidebar-facts' ||
        blockId === 'wri-baseline-island-coverage' ||
        blockId === 'wri-baseline-rig-gallery-cta'
      );
    }
    const section = this.section();
    if (section === 'fold') return true;
    if (section === 'services') return true;
    if (section === 'proof') return this.selectedId('proof') === 'proof-reviews';
    if (section === 'areas') return true;
    return false;
  }

  baselineStructuralHint(): string {
    const block = this.activeBlock();
    if (!block) return 'Select a block to edit inline copy in the canvas preview.';
    if (block.section === 'hero') {
      return 'Pick a hero from the full library below — approved baseline first, then lab layouts from every templatized site. Click text in the preview to edit copy.';
    }
    if (block.section === 'fold') {
      return 'Pick a fold layout from the full library below — approved baseline first, then lab layouts from every templatized site. Click text in the preview to edit copy.';
    }
    return `Editing ${block.label ?? block.blockId}. Click text in the preview to change copy. Structural lists sync from the approved WRI Option 2B baseline.`;
  }

  addBaselineBlockStat(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const stats = Array.isArray(props?.['stats']) ? [...(props!['stats'] as unknown[])] : [];
    stats.push({ value: 'New stat', label: 'Label' });
    this.buildBook.updateBlockProps(block.id, { stats });
  }

  addBaselineBullet(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const bullets = Array.isArray(props?.['bullets']) ? [...(props!['bullets'] as string[])] : [];
    bullets.push('New bullet');
    this.buildBook.updateBlockProps(block.id, { bullets });
  }

  addBaselineCredential(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const credentials = Array.isArray(props?.['credentials'])
      ? [...(props!['credentials'] as unknown[])]
      : [];
    credentials.push({ claim: 'New credential', proof: 'Supporting proof' });
    this.buildBook.updateBlockProps(block.id, { credentials });
  }

  addBaselineLifecycleStep(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const steps = Array.isArray(props?.['steps']) ? [...(props!['steps'] as unknown[])] : [];
    steps.push({ step: String(steps.length + 1).padStart(2, '0'), title: 'New step', body: 'Description' });
    this.buildBook.updateBlockProps(block.id, { steps });
  }

  addBaselineCapability(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const capabilities = Array.isArray(props?.['capabilities'])
      ? [...(props!['capabilities'] as unknown[])]
      : [];
    capabilities.push({
      title: 'New capability',
      body: 'Description',
      image: props?.['backgroundImageSrc'] ?? '',
      href: '#services',
    });
    this.buildBook.updateBlockProps(block.id, { capabilities });
  }

  addBaselineFeaturedMetric(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const metrics = Array.isArray(props?.['metrics']) ? [...(props!['metrics'] as unknown[])] : [];
    metrics.push({ label: 'Metric', value: 'Value' });
    this.buildBook.updateBlockProps(block.id, { metrics });
  }

  addBaselineFact(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const facts = Array.isArray(props?.['facts']) ? [...(props!['facts'] as unknown[])] : [];
    facts.push({ label: 'Fact', value: 'Detail' });
    this.buildBook.updateBlockProps(block.id, { facts });
  }

  addBaselineOffice(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const offices = Array.isArray(props?.['offices']) ? [...(props!['offices'] as unknown[])] : [];
    offices.push({
      label: 'New office',
      address: 'Street address',
      city: 'City, HI',
      phone: '(808) 531-8422',
    });
    this.buildBook.updateBlockProps(block.id, { offices });
  }

  addBaselineIsland(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const islands = Array.isArray(props?.['islands']) ? [...(props!['islands'] as string[])] : [];
    islands.push('New island');
    this.buildBook.updateBlockProps(block.id, { islands });
  }

  addBaselineGalleryItem(): void {
    const block = this.activeBlock();
    if (!block) return;
    const props = this.buildBook.blockProps(block.id);
    const gallery = Array.isArray(props?.['gallery']) ? [...(props!['gallery'] as unknown[])] : [];
    gallery.push({
      label: 'New project',
      image: props?.['backgroundImageSrc'] ?? '',
      location: 'Hawaii',
    });
    this.buildBook.updateBlockProps(block.id, { gallery });
  }

  onBaselineBlockDrop(event: CdkDragDrop<ReturnType<typeof baselineNavEntriesFromBlocks>>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.buildBook.reorderHomepageNavEntries(event.previousIndex, event.currentIndex);
  }

  openAddBlockDialog(): void {
    this.addBlockDialogOpen.set(true);
  }

  closeAddBlockDialog(): void {
    this.addBlockDialogOpen.set(false);
  }

  addBaselineBlockFromCatalog(blockId: string): void {
    const blocks = this.baselineBlocks();
    const activeIndex = blocks.findIndex((block) => block.id === this.activeBlockId());
    const existingCount = blocks.filter((block) => block.blockId === blockId).length;
    const nextId = `home-${blockId}-${existingCount + 1}`;
    this.buildBook.addHomepageBlock(blockId, activeIndex >= 0 ? activeIndex : blocks.length - 1);
    this.addBlockDialogOpen.set(false);
    this.selectBlock(nextId);
  }

  removeBaselineBlock(blockInstanceId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.buildBook.removeHomepageBlock(blockInstanceId);
    if (this.activeBlockId() === blockInstanceId) {
      const first = this.baselineBlocks()[0];
      if (first) this.selectBlock(first.id);
    }
  }

  isPinnedBaselineBlock(blockId: string): boolean {
    return (
      blockId === 'wri-baseline-hero-life-proof' ||
      blockId === 'wri-baseline-contract-bar' ||
      blockId === 'sparky-baseline-hero-callout'
    );
  }

  isPinnedBaselineEntry(entry: ReturnType<typeof baselineNavEntriesFromBlocks>[number]): boolean {
    if (entry.type === 'hero-unit') return true;
    return entry.blocks.some((block) => this.isPinnedBaselineBlock(block.blockId));
  }

  async onHeroImageSelected(url: string): Promise<void> {
    if (!this.buildBook.draft()) return;
    const pending = this.pendingImageEdit();
    if (pending) {
      this.buildBook.updateBlockPropPath(pending.blockInstanceId, pending.propPath, url);
      this.pendingImageEdit.set(null);
    } else {
      this.buildBook.updateHeroImage(url);
    }
    await this.save();
    this.openPreview();
  }

  onPreviewLayoutFromStudio(layoutId: string): void {
    const opt = findBuildBookOption('hero', layoutId);
    if (opt) void this.selectOption('hero', layoutId);
  }

  onPreviewBrandFromStudio(brand: BuildBookDemoBrand): void {
    this.demoBrand.set(brand);
  }

  onHeroPreviewBrandChange(brand: BuildBookDemoBrand): void {
    this.demoBrand.set(brand);
    const heroes = BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === brand);
    const first = heroes[0];
    if (first) void this.selectOption('hero', first.id);
  }

  onHeroPreviewIndexChange(index: number): void {
    this.heroPreviewIndex.set(index);
    const hero = BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === this.heroPreviewBrand())[index];
    if (hero) void this.selectOption('hero', hero.id);
  }

  startPreviewResize(event: PointerEvent): void {
    if (!this.previewOpen()) return;
    event.preventDefault();
    const startX = event.clientX;
    const startW = this.previewWidth();

    const onMove = (moveEvent: PointerEvent): void => {
      const next = startW + (startX - moveEvent.clientX);
      this.previewWidth.set(Math.min(Math.max(next, 220), 360));
    };

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  selectDemoBrand(brand: BuildBookDemoBrand): void {
    this.demoBrand.set(brand);
  }

  selectChapter(chapter: BuildBookChapter): void {
    this.chapter.set(chapter);
    this.syncWorkflowToUrl();
    if (chapter === 'homepage' && this.section() === 'hero') {
      this.openPreview();
    } else if (chapter === 'homepage') {
      this.openPreview();
    } else {
      this.closePreview();
    }
  }

  async selectOption(section: BuildBookSection, optionId: string): Promise<void> {
    if (this.isOptionSelected(section, optionId)) return;
    this.buildBook.selectOption(section, optionId);
    if (section === 'hero') {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === optionId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
      const opt = findBuildBookOption('hero', optionId);
      if (opt?.demo?.brand) this.demoBrand.set(opt.demo.brand);
    }
    this.openPreview();
  }

  selectBaselineLayoutOption(optionId: string): void {
    const block = this.activeBlock();
    if (!block || (block.section !== 'hero' && block.section !== 'fold')) return;
    if (this.isOptionSelected(block.section, optionId)) return;

    this.buildBook.selectBaselineLayoutOption(block.id, optionId);

    if (block.section === 'hero') {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === optionId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
      const opt = findBuildBookOption('hero', optionId);
      if (opt?.demo?.brand) this.demoBrand.set(opt.demo.brand);
    }
    this.openPreview();
  }

  selectBaselineHeroOption(optionId: string): void {
    this.selectBaselineLayoutOption(optionId);
  }

  onBaselinePanelOptionSelect(optionId: string): void {
    if (this.isBaselineMode()) {
      this.selectBaselineLayoutOption(optionId);
      return;
    }
    void this.selectOption(this.section(), optionId);
  }

  onHeroPanelOptionSelect(optionId: string): void {
    this.onBaselinePanelOptionSelect(optionId);
  }

  selectedId(section: BuildBookSection): string | null {
    return this.buildBook.selectedOptionId(section);
  }

  sectionLabel(id: BuildBookSection): string {
    return buildBookSectionLabel(id);
  }

  sectionNum(id: BuildBookSection): string {
    return buildBookSectionNum(id);
  }

  sectionDeck(id: BuildBookSection): string {
    return SECTION_DECK[id];
  }

  optionsForSection(section: BuildBookSection): BuildBookOption[] {
    const all = BUILD_BOOK_OPTIONS[section];
    const brand = section === 'hero' ? 'all' : this.demoBrand();
    return filterDemoOptions(section, all, brand);
  }

  baselineLayoutOptionsVisible(): boolean {
    const section = this.activeBlock()?.section;
    return this.isBaselineMode() && (section === 'hero' || section === 'fold');
  }

  heroPanelOptions(): BuildBookOption[] {
    if (this.isBaselineMode()) {
      return [...this.heroPanelApprovedOptions(), ...this.heroPanelLabOptions()];
    }
    return this.optionsForSection(this.section());
  }

  heroPanelApprovedOptions(): BuildBookOption[] {
    const block = this.activeBlock();
    if (block?.section === 'fold') {
      return BASELINE_APPROVED_FOLD_LIBRARY;
    }
    return baselineApprovedHeroOptionsForBrand(this.baselineTemplateBrand());
  }

  heroPanelLabOptions(): BuildBookOption[] {
    const section = this.heroPanelSection();
    return filterDemoOptions(section, BUILD_BOOK_OPTIONS[section], 'all');
  }

  resetBaselineHeroPhoto(): void {
    const block = this.activeBlock();
    if (!block || block.section !== 'hero') return;
    this.buildBook.resetBaselineHeroImageToTemplateDefault(block.id);
    this.openPreview();
  }

  heroPanelSection(): BuildBookSection {
    if (this.isBaselineMode()) {
      const section = this.activeBlock()?.section;
      if (section === 'hero' || section === 'fold') return section;
    }
    return this.section();
  }

  baselineTemplateBrand(): BuildBookDemoBrand {
    const fromBlock = this.baselineBlocks()[0]?.props['labBrand'];
    if (fromBlock === 'sparky' || fromBlock === 'wri' || fromBlock === 'consult' || fromBlock === 'veil') {
      return fromBlock;
    }

    const templateId = this.selectedTemplateId();
    if (templateId === 'sparky-electric-trades-v1') return 'sparky';
    if (templateId === 'wilco-consulting-v1') return 'consult';
    if (templateId === 'veil-live-painter-v1') return 'veil';
    return 'wri';
  }

  sectionShowsDemoBrandTabs(section: BuildBookSection): boolean {
    return isBuildBookDemoSection(section) && section !== 'hero';
  }

  demoBrandsForSection(section: BuildBookSection): BuildBookDemoBrand[] {
    return brandsForDemoSection(section);
  }

  sectionUsesDemoCatalog(section: BuildBookSection): boolean {
    return isBuildBookDemoSection(section);
  }

  demoBrandLabel(brand: BuildBookDemoBrand): string {
    return demoBrandLabel(brand);
  }

  demoBrandDot(brand: BuildBookDemoBrand): string {
    return demoBrandDot(brand);
  }

  isOptionSelected(section: BuildBookSection, optionId: string): boolean {
    if (section === 'hero') {
      if (this.isBaselineMode()) {
        const block = this.activeBlock();
        if (block?.section === 'hero') {
          return resolveBaselineHeroLayoutId(block.blockId, block.props) === optionId;
        }
      }
      return this.heroLayoutId() === optionId;
    }
    if (section === 'fold') {
      if (this.isBaselineMode()) {
        const block = this.activeBlock();
        if (block?.section === 'fold') {
          return resolveBaselineFoldLayoutId(block.blockId, block.props) === optionId;
        }
      }
      return this.selectedId('fold') === optionId;
    }
    return this.selectedId(section) === optionId;
  }

  astroUnitLabel(astroUnit: string): string {
    const parts = astroUnit.split('/');
    return parts[parts.length - 1] ?? astroUnit;
  }

  async save(): Promise<void> {
    await this.buildBook.save();
  }

  async initializeDraft(): Promise<void> {
    const ok = await this.buildBook.initializeStarterDraft();
    if (ok) {
      this.chapter.set('homepage');
      this.syncWorkflowToUrl();
      await this.save();
    }
  }

  async useStarterTemplate(template: BuildBookTemplateDefinition): Promise<void> {
    this.setEntryMode('template');
    this.buildBook.setSelectedTemplateId(template.id);
    await this.initializeDraft();
    if (!hasBuildBookBaselineAssembly(template.id)) {
      await this.selectOption('hero', template.recommendedHeroId);
      await this.selectOption('fold', template.recommendedFoldId);
      await this.selectOption('services', template.recommendedServicesId);
      await this.save();
    } else {
      const first = this.buildBook.homepageBlocks()[0];
      if (first) {
        this.activeBlockId.set(first.id);
        this.section.set(first.section);
      }
    }
    this.chapter.set('homepage');
    this.syncWorkflowToUrl();
    this.openPreview();
  }

  isTemplateSelected(template: BuildBookTemplateDefinition): boolean {
    return this.selectedTemplateId() === template.id;
  }

  templateActionLabel(template: BuildBookTemplateDefinition): string {
    if (this.buildBook.initializing()) return 'Applying...';
    return this.isTemplateSelected(template) ? 'Selected' : 'Select template';
  }

  templatePreviewImage(template: BuildBookTemplateDefinition): string {
    const ink = template.id.includes('wilco') ? '#18181b' : template.accent;
    const bg = template.id.includes('sparky')
      ? '#fff7ed'
      : template.id.includes('wri')
        ? '#ecfeff'
        : '#f4f4f5';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
        <rect width="640" height="360" fill="${bg}"/>
        <rect x="38" y="34" width="564" height="292" rx="24" fill="#fff" stroke="#e4e4e7"/>
        <rect x="70" y="68" width="108" height="14" rx="7" fill="${ink}"/>
        <rect x="406" y="69" width="44" height="8" rx="4" fill="#d4d4d8"/>
        <rect x="466" y="69" width="44" height="8" rx="4" fill="#d4d4d8"/>
        <rect x="526" y="66" width="44" height="14" rx="7" fill="${ink}" opacity=".9"/>
        <rect x="70" y="118" width="250" height="26" rx="13" fill="${ink}" opacity=".18"/>
        <rect x="70" y="158" width="310" height="20" rx="10" fill="#18181b"/>
        <rect x="70" y="190" width="238" height="12" rx="6" fill="#a1a1aa"/>
        <rect x="70" y="214" width="202" height="12" rx="6" fill="#d4d4d8"/>
        <rect x="70" y="252" width="112" height="28" rx="14" fill="${ink}"/>
        <rect x="398" y="116" width="146" height="142" rx="22" fill="${ink}" opacity=".9"/>
        <circle cx="512" cy="142" r="44" fill="#fff" opacity=".2"/>
        <rect x="398" y="276" width="48" height="10" rx="5" fill="#d4d4d8"/>
        <rect x="460" y="276" width="48" height="10" rx="5" fill="#d4d4d8"/>
        <rect x="522" y="276" width="48" height="10" rx="5" fill="#d4d4d8"/>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  openTemplatePreview(template: BuildBookTemplateDefinition): void {
    window.open(template.previewUrl, '_blank', 'noopener,noreferrer');
  }

  openPreviewInNewTab(): void {
    this.openPreview();
  }

  blockAssemblyPreviewUrl(): string | null {
    const homepage = this.buildBook.pages().find((page) => page.kind === 'homepage');
    const previewUrl = homepage?.blocks
      .map((block) => block.props['baselinePreviewUrl'])
      .find((value): value is string => typeof value === 'string' && value.length > 0);
    return previewUrl ?? null;
  }

  themeLabel(): string {
    const theme = this.buildBook.draft()?.theme;
    if (!theme) return '—';
    return theme.replace(/-/g, ' ');
  }

  siteLabel(): string {
    return this.activeProspectContext()?.name || this.strategy.site()?.displayName || 'Your site';
  }

  websiteStatusLabel(status: BuildBookProspectContext['websiteStatus']): string {
    switch (status) {
      case 'none':
        return 'No website';
      case 'poor':
        return 'Weak website';
      case 'fair':
        return 'Existing site';
      case 'good':
        return 'Good site';
      default:
        return 'Website unknown';
    }
  }

  priorityLabel(priority: BuildBookProspectContext['priority']): string {
    switch (priority) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'monitor':
        return 'Monitor';
      default:
        return 'Demo';
    }
  }

  private restoreWorkflowFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const chapter = params.get('chapter');
    const section = params.get('section');
    const validChapter = this.chapters.some((item) => item.id === chapter);
    const validSection = this.navSlots.some((slot) => slot === section);

    if (validSection) {
      this.section.set(section as BuildBookSection);
    }

    if (chapter === 'image-tone') {
      this.chapter.set('site-info-images');
    } else if (validChapter) {
      this.chapter.set(chapter as BuildBookChapter);
    } else if (validSection) {
      this.chapter.set('homepage');
    }

    if (this.chapter() === 'homepage') {
      this.openPreview();
    } else if (this.chapter() !== 'homepage') {
      this.closePreview();
    }
  }

  private syncWorkflowToUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'build-book');
    url.searchParams.set('chapter', this.chapter());
    if (this.chapter() === 'homepage') {
      url.searchParams.set('section', this.section());
    } else {
      url.searchParams.delete('section');
    }
    window.history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
}
