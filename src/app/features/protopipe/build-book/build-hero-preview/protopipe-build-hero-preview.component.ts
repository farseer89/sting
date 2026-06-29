import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import {
  BUILD_DEMO_HERO_VARIANTS,
  type BuildDemoHeroVariant,
} from '../build-book-demo.catalog';
import {
  DEFAULT_HERO_PREVIEW_COPY,
  type BuildHeroPreviewBrand,
  type BuildHeroPreviewCopy,
} from '../build-hero-preview.types';
import { heroBackgroundImageStyle } from '../build-hero-block.util';
import { ProtopipeBuildInlineTextComponent } from '../inline/build-inline-text.component';
import { ProtopipeBuildInlineCtaComponent } from '../inline/build-inline-cta.component';
import { ProtopipeBuildImageTargetComponent } from '../inline/build-image-target.component';

@Component({
  selector: 'app-protopipe-build-hero-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ProtopipeBuildInlineTextComponent,
    ProtopipeBuildInlineCtaComponent,
    ProtopipeBuildImageTargetComponent,
  ],
  templateUrl: './protopipe-build-hero-preview.component.html',
  styleUrl: './protopipe-build-hero-preview.component.scss',
})
export class ProtopipeBuildHeroPreviewComponent {
  readonly imageUrl = input.required<string>();
  readonly layout = input.required<string>();
  readonly copy = input<BuildHeroPreviewCopy>(DEFAULT_HERO_PREVIEW_COPY);
  readonly brand = input<BuildHeroPreviewBrand>('sparky');
  readonly heroLabel = input('');
  readonly siteUrl = input('');
  readonly heroIndex = input(0);
  readonly editable = input(false);

  readonly brandChange = output<BuildHeroPreviewBrand>();
  readonly heroIndexChange = output<number>();
  readonly copyChange = output<BuildHeroPreviewCopy>();
  readonly imageEdit = output<void>();

  readonly brandHeroes = computed((): BuildDemoHeroVariant[] =>
    BUILD_DEMO_HERO_VARIANTS.filter((h) => h.brand === this.brand()),
  );

  readonly headlineHtml = computed(() =>
    this.copy()
      .headline.replace(/\n/g, '<br>')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;br&gt;/g, '<br>'),
  );

  patchCopy(field: keyof BuildHeroPreviewCopy, value: string): void {
    this.copyChange.emit({ ...this.copy(), [field]: value });
  }

  backgroundImageStyle(): string | null {
    return heroBackgroundImageStyle(this.imageUrl());
  }

  onSelectBrand(brand: BuildHeroPreviewBrand): void {
    this.brandChange.emit(brand);
  }

  onPrevHero(): void {
    const heroes = this.brandHeroes();
    if (!heroes.length) return;
    const next = (this.heroIndex() - 1 + heroes.length) % heroes.length;
    this.heroIndexChange.emit(next);
  }

  onNextHero(): void {
    const heroes = this.brandHeroes();
    if (!heroes.length) return;
    const next = (this.heroIndex() + 1) % heroes.length;
    this.heroIndexChange.emit(next);
  }

  setHeroIndex(index: number): void {
    this.heroIndexChange.emit(index);
  }
}
