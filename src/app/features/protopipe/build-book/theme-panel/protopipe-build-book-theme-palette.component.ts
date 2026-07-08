import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';
import type { SiteThemeColorTokens } from '../../site-design/site-design.types';
import {
  SITE_THEME_HARMONY_MODES,
  generateHarmonyPalette,
  hexToHsl,
  mapPaletteChipsToColorOverride,
  pickColorFromWheel,
  type SiteThemeHarmonyMode,
  type SiteThemePaletteChip,
  type SiteThemePaletteChipRole,
} from '../../site-design/site-theme-palette.util';
import { contrastTextOn } from '../../site-design/site-theme-contrast.util';

@Component({
  selector: 'app-protopipe-build-book-theme-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button],
  templateUrl: './protopipe-build-book-theme-palette.component.html',
  styleUrl: './protopipe-build-book-theme-palette.component.scss',
})
export class ProtopipeBuildBookThemePaletteComponent implements AfterViewInit {
  readonly colors = input<SiteThemeColorTokens | null>(null);

  private readonly buildBook = inject(ProtopipeBuildBookService);
  private readonly wheelRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');

  readonly harmonyModes = SITE_THEME_HARMONY_MODES;
  readonly harmonyMode = signal<SiteThemeHarmonyMode>('analogous');
  readonly baseHue = signal(200);
  readonly baseSaturation = signal(68);
  readonly baseLightness = signal(48);
  readonly selectedChipRole = signal<SiteThemePaletteChipRole>('accent');
  readonly draggingWheel = signal(false);

  private seededFromTheme = false;

  readonly paletteChips = computed(() =>
    generateHarmonyPalette(
      this.baseHue(),
      this.baseSaturation(),
      this.baseLightness(),
      this.harmonyMode(),
    ),
  );

  readonly baseHex = computed(
    () => this.paletteChips().find((chip) => chip.role === 'accent')?.hex ?? '#2563eb',
  );

  readonly indicatorStyle = computed(() => {
    const hue = this.baseHue();
    const sat = this.baseSaturation();
    const angleRad = (hue * Math.PI) / 180;
    const radius = (sat / 100) * 42;
    const x = 50 + Math.cos(angleRad) * radius;
    const y = 50 + Math.sin(angleRad) * radius;
    return {
      left: `${x}%`,
      top: `${y}%`,
      background: this.baseHex(),
    };
  });

  constructor() {
    effect(() => {
      const colors = this.colors();
      if (!colors || this.seededFromTheme) return;
      const accentHsl = hexToHsl(colors.accent);
      if (!accentHsl) return;
      this.baseHue.set(accentHsl.h);
      this.baseSaturation.set(Math.max(accentHsl.s, 28));
      this.baseLightness.set(accentHsl.l);
      this.seededFromTheme = true;
    });

    effect(() => {
      this.baseHue();
      this.baseSaturation();
      this.baseLightness();
      this.harmonyMode();
      queueMicrotask(() => this.drawWheel());
    });
  }

  ngAfterViewInit(): void {
    this.drawWheel();
  }

  setHarmonyMode(mode: SiteThemeHarmonyMode): void {
    this.harmonyMode.set(mode);
  }

  onLightnessInput(value: string | number): void {
    const next = Number(value);
    if (Number.isFinite(next)) this.baseLightness.set(Math.min(70, Math.max(28, next)));
  }

  onWheelPointerDown(event: PointerEvent): void {
    const canvas = this.wheelRef()?.nativeElement;
    if (!canvas) return;
    this.draggingWheel.set(true);
    canvas.setPointerCapture(event.pointerId);
    this.pickFromWheelEvent(event);
  }

  onWheelPointerMove(event: PointerEvent): void {
    if (!this.draggingWheel()) return;
    this.pickFromWheelEvent(event);
  }

  onWheelPointerUp(event: PointerEvent): void {
    const canvas = this.wheelRef()?.nativeElement;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    this.draggingWheel.set(false);
  }

  selectChip(chip: SiteThemePaletteChip): void {
    this.selectedChipRole.set(chip.role);
    const hsl = hexToHsl(chip.hex);
    if (!hsl) return;
    if (chip.role === 'accent') {
      this.baseHue.set(hsl.h);
      this.baseSaturation.set(Math.max(hsl.s, 24));
      this.baseLightness.set(hsl.l);
    }
  }

  applyPalette(): void {
    this.buildBook.patchSiteTheme({
      colorOverride: mapPaletteChipsToColorOverride(this.paletteChips()),
    });
  }

  chipAriaLabel(chip: SiteThemePaletteChip): string {
    return `${chip.label} ${chip.hex}`;
  }

  chipTextColor(hex: string): string {
    return contrastTextOn(hex);
  }

  private pickFromWheelEvent(event: PointerEvent): void {
    const canvas = this.wheelRef()?.nativeElement;
    if (!canvas) return;
    const pick = pickColorFromWheel(
      event.clientX,
      event.clientY,
      canvas.getBoundingClientRect(),
      this.baseLightness(),
    );
    this.baseHue.set(Math.round(pick.hue));
    this.baseSaturation.set(Math.round(Math.max(pick.saturation, 18)));
  }

  private drawWheel(): void {
    const canvas = this.wheelRef()?.nativeElement;
    if (!canvas) return;

    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 2;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const start = ((angle - 0.5) * Math.PI) / 180;
      const end = ((angle + 0.5) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle} 100% 50%)`;
      ctx.fill();
    }

    const innerRadius = radius * 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.stroke();
  }
}
