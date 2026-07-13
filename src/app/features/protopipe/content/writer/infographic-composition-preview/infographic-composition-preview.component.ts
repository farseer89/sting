import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import type { InfographicCompositionDto } from '@hive/contracts';
import type { SiteThemeTokens } from '../../../site-design/site-design.types';
import { siteThemeToInfographicPalette } from '../../../site-design/site-theme.util';

@Component({
  selector: 'app-infographic-composition-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgStyle],
  templateUrl: './infographic-composition-preview.component.html',
  styleUrl: './infographic-composition-preview.component.scss',
})
export class InfographicCompositionPreviewComponent {
  readonly composition = input<InfographicCompositionDto | null | undefined>(null);
  readonly slotId = input<string | undefined>();
  readonly siteTheme = input<SiteThemeTokens | null>(null);

  readonly variantClass = computed(() => {
    const variant = this.composition()?.variant ?? 'flat-vector';
    return `pp-infographic--${variant}`;
  });

  readonly canvasStyle = computed(() => {
    const composition = this.composition();
    const sitePalette = this.siteTheme() ? siteThemeToInfographicPalette(this.siteTheme()!) : null;
    if (!composition && !sitePalette) return null;

    const palette = composition?.palette ?? sitePalette;
    if (!palette) return null;

    const styles: Record<string, string> = {
      '--ig-primary': palette.primary,
      '--ig-accent': palette.accent,
      '--ig-bg': palette.background,
    };

    if (composition?.variant === 'photo-texture' && composition.textureUrl?.trim()) {
      const url = composition.textureUrl.trim();
      styles['background-image'] =
        `linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.55)), url('${url}')`;
      styles['background-size'] = 'cover';
      styles['background-position'] = 'center';
    }

    return styles;
  });

  readonly gridClass = computed(() => {
    const layout = this.composition()?.layout ?? 'bullets';
    return `pp-infographic__grid pp-infographic__grid--${layout}`;
  });

  readonly showStepNumbers = computed(() => this.composition()?.layout === 'steps');
}
