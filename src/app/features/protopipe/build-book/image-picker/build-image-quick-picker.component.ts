import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ProtopipeMediaStudioService } from '../../protopipe-media-studio.service';

@Component({
  selector: 'app-protopipe-build-image-quick-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './build-image-quick-picker.component.html',
  styleUrl: './build-image-quick-picker.component.scss',
})
export class ProtopipeBuildImageQuickPickerComponent {
  private readonly studio = inject(ProtopipeMediaStudioService);

  readonly open = input(false);
  readonly selectedUrl = input<string | null>(null);
  readonly title = input('Choose an image');

  readonly closed = output<void>();
  readonly selected = output<string>();
  readonly library = output<void>();

  readonly loading = signal(false);
  readonly assets = computed(() => this.studio.assets());

  constructor() {
    effect(() => {
      if (this.open()) void this.ensureAssetsLoaded();
    });
  }

  close(): void {
    this.closed.emit();
  }

  select(url: string): void {
    this.selected.emit(url);
  }

  openLibrary(): void {
    this.library.emit();
  }

  private async ensureAssetsLoaded(): Promise<void> {
    if (this.studio.assets().length > 0) return;
    this.loading.set(true);
    try {
      await this.studio.loadAssets();
    } finally {
      this.loading.set(false);
    }
  }
}
