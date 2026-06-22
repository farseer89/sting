import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { ArticleNavSlot } from '../article-nav.util';

@Component({
  selector: 'app-article-section-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './article-section-nav.component.html',
  styleUrl: './article-section-nav.component.scss',
})
export class ArticleSectionNavComponent {
  readonly slots = input.required<ArticleNavSlot[]>();
  readonly activeSlotId = input<string | null>(null);
  readonly keywordLabel = input('');
  readonly footChip = input('');
  readonly readyCount = input(0);

  readonly slotSelect = output<string>();
}
