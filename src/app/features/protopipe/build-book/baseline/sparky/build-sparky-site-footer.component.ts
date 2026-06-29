import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { SPARKY_SITE_CHROME } from './sparky-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-sparky-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './build-sparky-site-footer.component.html',
})
export class ProtopipeBuildSparkySiteFooterComponent {
  readonly editable = input(true);
  readonly chrome = SPARKY_SITE_CHROME;
  readonly year = new Date().getFullYear();

  onLinkClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
