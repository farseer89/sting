import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
} from '@angular/core';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';
import { ProtopipeKeywordPickerComponent } from '../keyword-picker/protopipe-keyword-picker.component';
import { ProtopipeKeywordPickerStore } from '../keyword-picker/protopipe-keyword-picker.store';

@Component({
  selector: 'app-protopipe-home-keywords',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeKeywordPickerComponent],
  templateUrl: './protopipe-home-keywords.component.html',
  styleUrl: './protopipe-home-keywords.component.scss',
})
export class ProtopipeHomeKeywordsComponent implements OnInit {
  private readonly store = inject(ProtopipeKeywordPickerStore);
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly confirmed = output<void>();
  readonly siteLabel = computed(
    () =>
      this.strategy.site()?.hostname ||
      this.strategy.site()?.displayName?.trim() ||
      'Your workspace',
  );

  ngOnInit(): void {
    void this.store.load();
  }
}
