import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { WRI_SITE_CHROME } from './wri-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-wri-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './build-wri-site-footer.component.html',
})
export class ProtopipeBuildWriSiteFooterComponent {
  readonly editable = input(true);
  readonly chrome = WRI_SITE_CHROME;
  readonly year = new Date().getFullYear();

  onLinkClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
