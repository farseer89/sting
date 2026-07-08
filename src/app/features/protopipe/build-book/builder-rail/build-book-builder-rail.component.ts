import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type BuildBookBuilderRailTab = 'stack' | 'patterns';
export type BuildBookPageBuilderView = 'stack' | 'add';

@Component({
  selector: 'app-build-book-builder-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './build-book-builder-rail.component.html',
  styleUrl: './build-book-builder-rail.component.scss',
})
export class BuildBookBuilderRailComponent {
  readonly title = input('Page builder');
  readonly subtitle = input<string | null>(null);
  readonly activeTab = input<BuildBookBuilderRailTab>('stack');
  readonly view = input<BuildBookPageBuilderView>('stack');
  readonly showTabs = input(true);
  readonly showClose = input(true);

  readonly tabChange = output<BuildBookBuilderRailTab>();
  readonly close = output<void>();
  readonly back = output<void>();

  selectTab(tab: BuildBookBuilderRailTab): void {
    if (this.activeTab() !== tab) {
      this.tabChange.emit(tab);
    }
  }

  isAddView(): boolean {
    return this.view() === 'add';
  }
}
