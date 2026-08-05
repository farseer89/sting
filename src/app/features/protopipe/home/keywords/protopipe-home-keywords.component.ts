import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeKeywordPickerComponent } from '../keyword-picker/protopipe-keyword-picker.component';
import { ProtopipeKeywordSearchPanelComponent } from '../keyword-picker/protopipe-keyword-search-panel.component';
import {
  ProtopipeKeywordPickerStore,
  type KeywordPickerWizardStep,
} from '../keyword-picker/protopipe-keyword-picker.store';

@Component({
  selector: 'app-protopipe-home-keywords',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeKeywordPickerComponent, ProtopipeKeywordSearchPanelComponent],
  templateUrl: './protopipe-home-keywords.component.html',
  styleUrls: [
    '../books/protopipe-home-keyword-book.component.scss',
    './protopipe-home-keywords.component.scss',
  ],
})
export class ProtopipeHomeKeywordsComponent implements OnInit {
  private readonly store = inject(ProtopipeKeywordPickerStore);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly confirmed = output<void>();
  readonly activeSection = signal<KeywordPickerWizardStep>('keywords');
  readonly siteLabel = computed(
    () =>
      this.strategy.site()?.hostname ||
      this.strategy.site()?.displayName?.trim() ||
      'Your workspace',
  );

  ngOnInit(): void {
    void this.store.load();
  }

  readonly panelCopy = computed(() => {
    switch (this.activeSection()) {
      case 'avatars':
        return {
          kicker: 'Audiences',
          title: 'Who are you writing for?',
          deck: 'Pick the customer types that match your selected keywords.',
        };
      case 'build':
        return {
          kicker: 'Build',
          title: 'Ready to build your plan',
          deck: 'Save your keywords and audiences, then generate your content plan.',
        };
      default:
        return {
          kicker: 'Selection',
          title: 'Choose what you want to rank for',
          deck: 'Search for a topic to explore related keywords from Google Ads. Selected keywords appear on the right.',
        };
    }
  });

  onBookSectionChange(section: KeywordPickerWizardStep): void {
    this.activeSection.set(section);
  }
}
