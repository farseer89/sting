import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { WRI_SITE_CHROME } from './wri-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-wri-site-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './build-wri-site-header.component.html',
})
export class ProtopipeBuildWriSiteHeaderComponent {
  readonly editable = input(true);
  readonly chrome = WRI_SITE_CHROME;

  onNavClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
