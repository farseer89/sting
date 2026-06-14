import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { CognitivePackCatalogItem } from './cognitive-pack.model';

@Component({
  selector: 'app-thought-pack-cover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="cover"
      [style.--pack-accent]="pack().accentColor"
      [attr.aria-label]="pack().coverImageAlt"
      role="img"
    >
      @switch (pack().id) {
        @case ('none') {
          <svg viewBox="0 0 400 300" class="cover__svg" aria-hidden="true">
            <rect width="400" height="300" fill="url(#std-bg)" />
            <rect x="120" y="80" width="160" height="140" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.35" />
            <path d="M140 200 L200 120 L260 200" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5" />
            <defs>
              <linearGradient id="std-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f1f5f9" />
                <stop offset="100%" stop-color="#e2e8f0" />
              </linearGradient>
            </defs>
          </svg>
        }
        @case ('trains_of_thought/v1') {
          <svg viewBox="0 0 400 300" class="cover__svg" aria-hidden="true">
            <rect width="400" height="300" fill="url(#tot-bg)" />
            @for (i of [0, 1, 2, 3, 4, 5, 6]; track i) {
              <path
                [attr.d]="'M' + (40 + i * 48) + ' 280 Q' + (200) + ' ' + (40 + i * 12) + ' 360 280'"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                [attr.opacity]="0.25 + i * 0.08"
              />
            }
            <circle cx="200" cy="140" r="24" fill="currentColor" opacity="0.9" />
            <defs>
              <linearGradient id="tot-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0a9396" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#005f73" stop-opacity="0.08" />
              </linearGradient>
            </defs>
          </svg>
        }
        @case ('saturated_serp') {
          <svg viewBox="0 0 400 300" class="cover__svg" aria-hidden="true">
            <rect width="400" height="300" fill="url(#serp-bg)" />
            @for (row of [0, 1, 2, 3]; track row) {
              @for (col of [0, 1, 2, 3, 4]; track col) {
                @if (!(row === 1 && col === 2)) {
                  <rect
                    [attr.x]="48 + col * 64"
                    [attr.y]="48 + row * 56"
                    width="52"
                    height="44"
                    rx="3"
                    fill="currentColor"
                    opacity="0.12"
                  />
                }
              }
            }
            <rect x="176" y="104" width="52" height="44" rx="3" fill="currentColor" opacity="0.85" />
            <defs>
              <linearGradient id="serp-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2563eb" stop-opacity="0.12" />
                <stop offset="100%" stop-color="#1e40af" stop-opacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        }
        @default {
          <svg viewBox="0 0 400 300" class="cover__svg" aria-hidden="true">
            <rect width="400" height="300" [attr.fill]="'url(#grad-' + pack().slug + ')'" />
            <circle cx="200" cy="150" r="60" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4" />
            <circle cx="200" cy="150" r="28" fill="currentColor" opacity="0.75" />
            <defs>
              <linearGradient [attr.id]="'grad-' + pack().slug" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" [attr.stop-color]="pack().accentColor" stop-opacity="0.22" />
                <stop offset="100%" [attr.stop-color]="pack().accentColor" stop-opacity="0.06" />
              </linearGradient>
            </defs>
          </svg>
        }
      }
    </div>
  `,
  styles: [
    `
      .cover {
        --pack-accent: #0a9396;
        color: var(--pack-accent);
        width: 100%;
        aspect-ratio: 4 / 3;
        border-radius: 10px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.02);
      }
      .cover__svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class ThoughtPackCoverComponent {
  readonly pack = input.required<CognitivePackCatalogItem>();
}
