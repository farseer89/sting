import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { ProtopipeBuildBookThemePaletteComponent } from './protopipe-build-book-theme-palette.component';
import { ProtopipeBuildBookThemeTypographyComponent } from './protopipe-build-book-theme-typography.component';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';
import type { SiteDesignContext, SiteThemeColorTokens } from '../../site-design/site-design.types';
import {
  applySiteThemeCssVarsToElement,
  siteThemeTokensToCssVars,
} from '../../site-design/public';
import { matchSiteThemeFontOptionId } from '../../site-design/site-theme-fonts.catalog';
import { ensureSiteThemeFontPreviewStyles } from '../../site-design/site-theme-font-preview-styles.util';

type ThemeColorField = keyof Pick<
  SiteThemeColorTokens,
  'background' | 'surface' | 'ink' | 'text' | 'muted' | 'accent' | 'accentSoft' | 'border'
>;

const COLOR_FIELDS: { key: ThemeColorField; label: string; hint?: string }[] = [
  { key: 'background', label: 'Page background' },
  { key: 'surface', label: 'Surface bands', hint: 'Stats, cards, alternate sections' },
  { key: 'ink', label: 'Ink / dark bands', hint: 'Headers, trust bars, footers' },
  { key: 'text', label: 'Body text' },
  { key: 'muted', label: 'Muted text' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentSoft', label: 'Accent soft' },
  { key: 'border', label: 'Border' },
];

@Component({
  selector: 'app-protopipe-build-book-theme-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Button,
    ProtopipeBuildBookThemePaletteComponent,
    ProtopipeBuildBookThemeTypographyComponent,
  ],
  templateUrl: './protopipe-build-book-theme-panel.component.html',
  styleUrl: './protopipe-build-book-theme-panel.component.scss',
})
export class ProtopipeBuildBookThemePanelComponent {
  readonly designContext = input<SiteDesignContext | null>(null);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly buildBook = inject(ProtopipeBuildBookService);

  readonly colorFields = COLOR_FIELDS;

  readonly theme = computed(() => {
    this.buildBook.siteTheme();
    return this.designContext()?.theme ?? null;
  });

  readonly previewStyle = computed((): Record<string, string> => {
    const theme = this.theme();
    return theme ? siteThemeTokensToCssVars(theme) : {};
  });

  readonly activeSansId = computed(() =>
    matchSiteThemeFontOptionId(this.theme()?.typography?.fontSans),
  );

  readonly activeSerifId = computed(() =>
    matchSiteThemeFontOptionId(this.theme()?.typography?.fontSerif),
  );

  readonly hasOverrides = computed(() => Boolean(this.buildBook.siteTheme()));

  constructor() {
    ensureSiteThemeFontPreviewStyles();

    effect(() => {
      applySiteThemeCssVarsToElement(this.host.nativeElement, this.previewStyle());
    });
  }

  colorValue(key: ThemeColorField): string {
    return this.theme()?.color[key] ?? '#000000';
  }

  onColorChange(key: ThemeColorField, value: string): void {
    const normalized = value.trim();
    if (!normalized) return;
    this.buildBook.patchSiteTheme({ colorOverride: { [key]: normalized } });
  }

  resetAll(): void {
    this.buildBook.resetSiteTheme();
  }

  resetColors(): void {
    this.buildBook.clearSiteThemeColorOverride();
  }
}
