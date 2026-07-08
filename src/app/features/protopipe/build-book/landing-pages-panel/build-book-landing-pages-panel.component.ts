import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Button } from 'primeng/button';
import type { BuildBookPage } from '../build-book.types';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';

@Component({
  selector: 'app-build-book-landing-pages-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './build-book-landing-pages-panel.component.html',
  styleUrl: './build-book-landing-pages-panel.component.scss',
})
export class BuildBookLandingPagesPanelComponent {
  readonly buildBook = inject(ProtopipeBuildBookService);

  readonly selectedPageId = input<string | null>(null);
  readonly selectedPageIdChange = output<string | null>();

  readonly newPageLabel = signal('New landing page');

  pages(): BuildBookPage[] {
    return this.buildBook.landingPages();
  }

  selectPage(pageId: string): void {
    this.selectedPageIdChange.emit(pageId);
  }

  createPage(): void {
    const page = this.buildBook.createLandingPage(this.newPageLabel());
    if (page) {
      this.selectedPageIdChange.emit(page.id);
      this.newPageLabel.set('New landing page');
    }
  }
}
