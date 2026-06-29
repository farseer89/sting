import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { WILCO_SITE_CHROME } from './wilco-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-wilco-site-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './build-wilco-site-header.component.html',
})
export class ProtopipeBuildWilcoSiteHeaderComponent {
  readonly editable = input(true);
  readonly chrome = WILCO_SITE_CHROME;

  onNavClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
