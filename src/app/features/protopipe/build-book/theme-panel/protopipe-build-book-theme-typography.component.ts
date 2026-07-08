import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';
import type { SiteThemeTypographyTokens } from '../../site-design/site-design.types';
import {
  matchSiteThemeFontPairingId,
  resolvedSiteThemeFontPairings,
  typographyOverrideForPairingId,
  type ResolvedSiteThemeFontPairing,
} from '../../site-design/site-theme-font-pairings.catalog';
import { matchSiteThemeFontOptionId } from '../../site-design/site-theme-fonts.catalog';
import { ensureSiteThemeCatalogFontsReady } from '../../site-design/site-theme-font-loader.util';
import { ensureSiteThemeFontPreviewStyles } from '../../site-design/site-theme-font-preview-styles.util';
import {
  ensureSiteThemeGoogleFontCatalogLoaded,
  ensureSiteThemeGoogleFontsLoaded,
} from '../../site-design/site-theme-google-fonts.util';
import { SiteThemeFontDirective } from '../../site-design/site-theme-font.directive';

@Component({
  selector: 'app-protopipe-build-book-theme-typography',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SiteThemeFontDirective],
  templateUrl: './protopipe-build-book-theme-typography.component.html',
  styleUrl: './protopipe-build-book-theme-typography.component.scss',
})
export class ProtopipeBuildBookThemeTypographyComponent {
  readonly typography = input<SiteThemeTypographyTokens | null>(null);

  private readonly buildBook = inject(ProtopipeBuildBookService);

  readonly fontPairings = resolvedSiteThemeFontPairings();

  readonly activeTypography = computed(() => {
    this.buildBook.siteTheme();
    return this.typography();
  });

  readonly selectedPairingId = computed(() => matchSiteThemeFontPairingId(this.activeTypography()));

  readonly activeSansId = computed(() =>
    matchSiteThemeFontOptionId(this.activeTypography()?.fontSans),
  );

  readonly activeSerifId = computed(() =>
    matchSiteThemeFontOptionId(this.activeTypography()?.fontSerif),
  );

  constructor() {
    ensureSiteThemeFontPreviewStyles();

    effect(() => {
      ensureSiteThemeGoogleFontCatalogLoaded();
      void ensureSiteThemeCatalogFontsReady();
      const typography = this.activeTypography();
      if (typography) ensureSiteThemeGoogleFontsLoaded(typography);
    });
  }

  isSelected(pairing: ResolvedSiteThemeFontPairing): boolean {
    return this.selectedPairingId() === pairing.id;
  }

  onPairingKeydown(event: KeyboardEvent, pairing: ResolvedSiteThemeFontPairing): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectPairing(pairing);
    }
  }

  selectPairing(pairing: ResolvedSiteThemeFontPairing): void {
    const override = typographyOverrideForPairingId(pairing.id);
    if (!override) return;
    this.buildBook.patchSiteTheme({ typographyOverride: override });
  }

  resetFonts(): void {
    this.buildBook.clearSiteThemeTypographyOverride();
  }
}
