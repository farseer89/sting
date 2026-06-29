import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { SPARKY_SITE_CHROME } from './sparky-site-chrome.constants';

@Component({
  selector: 'app-protopipe-build-sparky-site-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './build-sparky-site-header.component.html',
})
export class ProtopipeBuildSparkySiteHeaderComponent {
  readonly editable = input(true);
  readonly chrome = SPARKY_SITE_CHROME;

  onNavClick(event: MouseEvent): void {
    if (this.editable()) event.preventDefault();
  }
}
