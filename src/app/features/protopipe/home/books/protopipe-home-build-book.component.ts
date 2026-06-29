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
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ProtopipeBuildBookService, findDraftSectionForSlot } from '../../build-book/protopipe-build-book.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import {
  BUILD_BOOK_OPTIONS,
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
import type { BuildBookDemoBrand, BuildBookTemplateDefinition } from '../../build-book/build-book.types';
import { ProtopipeBuildHeroPreviewComponent } from '../../build-book/build-hero-preview/protopipe-build-hero-preview.component';
import { ProtopipeBuildImageStudioDialogComponent } from '../../build-book/build-image-studio/protopipe-build-image-studio-dialog.component';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../../build-book/build-hero-preview.types';
import type { BuildBookProspectContext } from '../../build-book/build-book-context';
import { BUILD_BOOK_TEMPLATE_DEFINITIONS } from '../../build-book/build-book-template.catalog';

const SECTION_DECK: Record<BuildBookSection, string> = {
  hero: 'Pick a hero layout, then open Hero images & copy to generate photos and set headline text — same live preview as pitch prep.',
  fold: 'Below-the-fold sections from the Sparky and WRI style labs — contract bars, capabilities, proof, and close patterns.',
  services: 'How service lines are organized on the homepage.',
  proof: 'Social proof — reviews, outcomes, or a single quote highlight.',
  areas: 'Coverage and process — FAQ accordion or how-it-works steps.',
  close: 'Final conversion — CTA banner or lead capture form.',
};

type BuildBookEntryMode = 'template' | 'blocks';
type BuildBookChapter =
  | 'templates'
  | 'image-tone'
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
    FormsModule,
    Button,
    Message,
    ProgressSpinner,
    ProtopipeBuildHeroPreviewComponent,
    ProtopipeBuildImageStudioDialogComponent,
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
  readonly previewOpen = signal(false);
  readonly previewWidth = signal(480);
  readonly imageStudioOpen = signal(false);

  readonly heroImageUrl = signal<string | null>(null);
  readonly heroCopy = signal<BuildHeroPreviewCopy>(DEFAULT_HERO_PREVIEW_COPY);
  readonly heroPreviewIndex = signal(0);

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
    { id: 'image-tone', label: 'Image tone', group: 'Design', status: 'next' },
    { id: 'homepage', label: 'Homepage', group: 'Build' },
    { id: 'landing-pages', label: 'Landing pages', group: 'Build', status: 'planned' },
    { id: 'blog-posts', label: 'Blog posts', group: 'Demo package', status: 'planned' },
    { id: 'review-gate', label: 'Review gate', group: 'Demo package', status: 'planned' },
    { id: 'lead-form', label: 'Lead form', group: 'Demo package', status: 'planned' },
    { id: 'checklist', label: 'Demo checklist', group: 'Launch', status: 'planned' },
  ];

  readonly chapterGroups = [...new Set(this.chapters.map((chapter) => chapter.group))];

  readonly heroLayoutId = computed(() => this.selectedId('hero') ?? 'sp-callout');

  readonly heroPreviewMeta = computed(
    () => BUILD_DEMO_HERO_VARIANTS.find((h) => h.id === this.heroLayoutId()) ?? BUILD_DEMO_HERO_VARIANTS[0],
  );

  readonly heroPreviewBrand = computed(
    (): BuildBookDemoBrand => this.heroPreviewMeta()?.brand ?? this.demoBrand(),
  );

  readonly configuredStackCount = computed(() =>
    this.navSlots.filter((slot) => Boolean(this.selectedId(slot))).length,
  );

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
    const url = this.selectedTemplate()?.previewUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

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
    if (draft) this.loadHeroStateFromDraft(draft);
    const site = this.strategy.site();
    if (site?.displayName) {
      this.heroCopy.update((c) => ({
        ...c,
        eyebrow: c.eyebrow === DEFAULT_HERO_PREVIEW_COPY.eyebrow ? `${site.displayName}` : c.eyebrow,
      }));
    }
  }

  private loadHeroStateFromDraft(draft: NonNullable<ReturnType<typeof this.buildBook.draft>>): void {
    const heroSection = findDraftSectionForSlot(draft, 'hero');
    if (!heroSection) return;

    const props = heroSection.props;
    const image =
      (typeof props['imageSrc'] === 'string' && props['imageSrc']) ||
      (typeof props['backgroundImageSrc'] === 'string' && props['backgroundImageSrc']) ||
      (typeof props['visualSrc'] === 'string' && props['visualSrc']) ||
      null;
    if (image) this.heroImageUrl.set(image);

    this.heroCopy.set({
      eyebrow: String(props['eyebrow'] ?? DEFAULT_HERO_PREVIEW_COPY.eyebrow),
      headline: String(props['heading'] ?? props['headline'] ?? DEFAULT_HERO_PREVIEW_COPY.headline),
      subhead: String(props['subhead'] ?? props['subheading'] ?? DEFAULT_HERO_PREVIEW_COPY.subhead),
      primaryCta: String(props['ctaLabel'] ?? props['primaryCtaLabel'] ?? DEFAULT_HERO_PREVIEW_COPY.primaryCta),
      secondaryCta: String(
        props['secondaryCtaLabel'] ?? DEFAULT_HERO_PREVIEW_COPY.secondaryCta,
      ),
    });

    const layoutId = typeof props['labLayout'] === 'string' ? props['labLayout'] : null;
    if (layoutId) {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === layoutId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
    }
  }

  selectSection(id: BuildBookSection): void {
    this.chapter.set('homepage');
    this.section.set(id);
    if (isBuildBookDemoSection(id)) {
      const brands = brandsForDemoSection(id);
      if (!brands.includes(this.demoBrand())) {
        this.demoBrand.set(brands[0] ?? 'sparky');
      }
    }
    if (id === 'hero') this.openPreview();
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

  openImageStudio(): void {
    this.imageStudioOpen.set(true);
  }

  closeImageStudio(): void {
    this.imageStudioOpen.set(false);
  }

  onHeroCopyChange(copy: BuildHeroPreviewCopy): void {
    this.heroCopy.set(copy);
    this.patchHeroDraftProps(copy);
    this.buildBook.markDirty();
  }

  async onHeroImageSelected(url: string): Promise<void> {
    this.heroImageUrl.set(url);
    this.patchHeroImage(url);
    this.buildBook.markDirty();
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
      this.previewWidth.set(Math.min(Math.max(next, 360), 720));
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
    if (chapter === 'homepage' && this.section() === 'hero') {
      this.openPreview();
    } else {
      this.closePreview();
    }
  }

  async selectOption(section: BuildBookSection, optionId: string): Promise<void> {
    if (this.selectedId(section) === optionId) return;
    this.buildBook.selectOption(section, optionId);
    if (section === 'hero') {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === optionId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
      const opt = findBuildBookOption('hero', optionId);
      if (opt?.demo?.brand) this.demoBrand.set(opt.demo.brand);
    }
    if (section === 'hero') this.openPreview();
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
    return filterDemoOptions(section, all, this.demoBrand());
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

  heroCardLayoutClass(opt: BuildBookOption): string {
    return opt.id;
  }

  astroUnitLabel(astroUnit: string): string {
    const parts = astroUnit.split('/');
    return parts[parts.length - 1] ?? astroUnit;
  }

  async save(): Promise<void> {
    this.patchHeroDraftProps(this.heroCopy());
    if (this.heroImageUrl()) this.patchHeroImage(this.heroImageUrl()!);
    await this.buildBook.save();
  }

  async initializeDraft(): Promise<void> {
    const ok = await this.buildBook.initializeStarterDraft();
    if (ok) {
      this.chapter.set('homepage');
      await this.save();
    }
  }

  async useStarterTemplate(template: BuildBookTemplateDefinition): Promise<void> {
    this.setEntryMode('template');
    this.buildBook.setSelectedTemplateId(template.id);
    await this.initializeDraft();
    await this.selectOption('hero', template.recommendedHeroId);
    await this.selectOption('fold', template.recommendedFoldId);
    await this.selectOption('services', template.recommendedServicesId);
    this.chapter.set('homepage');
    this.openPreview();
    await this.save();
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

  private patchHeroDraftProps(copy: BuildHeroPreviewCopy): void {
    const draft = this.buildBook.draft();
    if (!draft) return;
    const hero = findDraftSectionForSlot(draft, 'hero');
    if (!hero) return;
    hero.props['eyebrow'] = copy.eyebrow;
    hero.props['heading'] = copy.headline;
    hero.props['subhead'] = copy.subhead;
    hero.props['ctaLabel'] = copy.primaryCta;
    hero.props['secondaryCtaLabel'] = copy.secondaryCta;
  }

  private patchHeroImage(url: string): void {
    const draft = this.buildBook.draft();
    if (!draft) return;
    const hero = findDraftSectionForSlot(draft, 'hero');
    if (!hero) return;
    hero.props['imageSrc'] = url;
    hero.props['backgroundImageSrc'] = url;
    hero.props['visualSrc'] = url;
  }
}
