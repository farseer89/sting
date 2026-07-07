import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { VEIL_SITE_CHROME } from './veil-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-veil-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <footer class="veil-footer">
      <div class="veil-wrap">
        <p class="veil-footer__brand">{{ chrome.name }}</p>
        <p>{{ chrome.location }}</p>
        <p><a class="veil-link" [href]="chrome.emailHref">{{ chrome.email }}</a></p>
      </div>
    </footer>
  `,
  styleUrl: './build-veil-site-footer.component.scss',
})
export class ProtopipeBuildVeilSiteFooterComponent {
  readonly chrome = VEIL_SITE_CHROME;
}
