import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { VEIL_SITE_CHROME } from './veil-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-veil-site-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <header class="veil-header">
      <div class="veil-wrap veil-header__inner">
        <a class="veil-logo" [href]="chrome.inquireHref">
          <span class="veil-logo__mark">{{ chrome.logoMark }}</span>
          <span class="veil-logo__sub">{{ chrome.logoSub }}</span>
        </a>
        <a class="veil-header__cta" [href]="chrome.inquireHref">Check my date</a>
      </div>
    </header>
  `,
  styleUrl: './build-veil-site-header.component.scss',
})
export class ProtopipeBuildVeilSiteHeaderComponent {
  readonly chrome = VEIL_SITE_CHROME;
}
