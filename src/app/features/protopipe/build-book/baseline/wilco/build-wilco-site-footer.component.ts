import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { WILCO_SITE_CHROME } from './wilco-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-wilco-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './build-wilco-site-footer.component.html',
})
export class ProtopipeBuildWilcoSiteFooterComponent {
  readonly editable = input(true);
  readonly chrome = WILCO_SITE_CHROME;
  readonly year = new Date().getFullYear();

  onLinkClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
