import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Button } from 'primeng/button';
import type { BuildBookPage } from '../build-book.types';
import { ProtopipeBuildBookService } from '../protopipe-build-book.service';

@Component({
  selector: 'app-build-book-content-posts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './build-book-content-posts-panel.component.html',
  styleUrl: './build-book-content-posts-panel.component.scss',
})
export class BuildBookContentPostsPanelComponent {
  readonly buildBook = inject(ProtopipeBuildBookService);

  readonly selectedPageId = input<string | null>(null);
  readonly selectedPageIdChange = output<string | null>();

  readonly newPageLabel = signal('Default blog template');

  pages(): BuildBookPage[] {
    return this.buildBook.blogPosts();
  }

  selectPage(pageId: string): void {
    this.selectedPageIdChange.emit(pageId);
  }

  createPage(): void {
    const page = this.buildBook.createBlogPostPage(this.newPageLabel());
    if (page) {
      this.selectedPageIdChange.emit(page.id);
      this.newPageLabel.set('Default blog template');
    }
  }
}
