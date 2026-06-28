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
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ProtopipeBuildBookService, findDraftSectionForSlot } from '../../build-book/protopipe-build-book.service';
import { ProtopipeSiteBuilderService } from '../../site-builder/protopipe-site-builder.service';
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
import type { BuildBookDemoBrand } from '../../build-book/build-book.types';
import { ProtopipeBuildHeroPreviewComponent } from '../../build-book/build-hero-preview/protopipe-build-hero-preview.component';
import { ProtopipeBuildImageStudioDialogComponent } from '../../build-book/build-image-studio/protopipe-build-image-studio-dialog.component';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewCopy,
} from '../../build-book/build-hero-preview.types';
import type { BuildBookProspectContext } from '../../build-book/build-book-context';

const SECTION_DECK: Record<BuildBookSection, string> = {
  hero: 'Pick a hero layout, then open Hero images & copy to generate photos and set headline text — same live preview as pitch prep.',
  fold: 'Below-the-fold sections from the Sparky and WRI style labs — contract bars, capabilities, proof, and close patterns.',
  services: 'How service lines are organized on the homepage.',
  proof: 'Social proof — reviews, outcomes, or a single quote highlight.',
  areas: 'Coverage and process — FAQ accordion or how-it-works steps.',
  close: 'Final conversion — CTA banner or lead capture form.',
};

type BuildBookEntryMode = 'template' | 'blocks';

interface BuildBookStarterTemplate {
  id: string;
  label: string;
  category: string;
  bestFor: string;
  stack: string;
  theme: string;
  accent: string;
}

const STARTER_TEMPLATES: BuildBookStarterTemplate[] = [
  {
    id: 'service-business-landing-v1',
    label: 'Local Service Landing',
    category: 'Service business',
    bestFor: 'No-site or weak-site local businesses that need a fast conversion page.',
    stack: 'Hero, proof, services, FAQ, lead capture',
    theme: 'Ocean',
    accent: '#0d9488',
  },
  {
    id: 'construction-trades-v1',
    label: 'Trades Authority',
    category: 'Construction & trades',
    bestFor: 'Contractors and trades with proof, service areas, and urgent quote intent.',
    stack: 'Full-bleed hero, stats, services, project proof',
    theme: 'Construction bold',
    accent: '#d97706',
  },
  {
    id: 'artist-landing-v1',
    label: 'Creative / Artist',
    category: 'Creative service',
    bestFor: 'Visual businesses where portfolio, story, and inquiry flow sell the work.',
    stack: 'Editorial hero, gallery, story, testimonials',
    theme: 'Classic gold',
    accent: '#b45309',
  },
  {
    id: 'starter-minimal-v1',
    label: 'Minimal Starter',
    category: 'Quick start',
    bestFor: 'Prospects that need a clean first web presence before full strategy.',
    stack: 'Hero, benefits, FAQ, close',
    theme: 'Ink cream',
    accent: '#52525b',
  },
];

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
  readonly siteBuilder = inject(ProtopipeSiteBuilderService);
  private readonly router = inject(Router);

  readonly section = signal<BuildBookSection>('hero');
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

  readonly starterTemplates = STARTER_TEMPLATES;

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

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.strategy.ensureLoaded();
    await this.siteBuilder.ensureLoaded();
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

  async selectOption(section: BuildBookSection, optionId: string): Promise<void> {
    if (this.selectedId(section) === optionId) return;
    this.buildBook.selectOption(section, optionId);
    if (section === 'hero') {
      const idx = BUILD_DEMO_HERO_VARIANTS.findIndex((h) => h.id === optionId);
      if (idx >= 0) this.heroPreviewIndex.set(idx);
      const opt = findBuildBookOption('hero', optionId);
      if (opt?.demo?.brand) this.demoBrand.set(opt.demo.brand);
    }
    await this.save();
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
    if (ok) await this.save();
  }

  async useStarterTemplate(template: BuildBookStarterTemplate): Promise<void> {
    this.setEntryMode('template');
    this.buildBook.setSelectedTemplateId(template.id);
    await this.initializeDraft();
    if (template.id === 'construction-trades-v1') {
      await this.selectOption('hero', 'sp-callout');
    } else if (template.id === 'artist-landing-v1') {
      await this.selectOption('hero', 'co-split');
    } else if (template.id === 'starter-minimal-v1') {
      await this.selectOption('hero', 'sp-teal');
    }
  }

  openVisualEditor(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    void this.router.navigate(['/protopipe/site-builder/sites', siteId, 'visual']);
  }

  openPreviewInNewTab(): void {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    window.open(`/protopipe/site-builder/sites/${siteId}/visual`, '_blank', 'noopener');
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
