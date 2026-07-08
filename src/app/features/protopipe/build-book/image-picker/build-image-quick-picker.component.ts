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
import { collectBuildBookTemplateCoreImages } from '../build-book-template-images.util';

type QuickPickerAsset = {
  id: string;
  url: string;
  label: string;
  source: 'template' | 'generated' | 'uploaded';
};

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
  readonly templateId = input<string | null>(null);

  readonly closed = output<void>();
  readonly selected = output<string>();
  readonly library = output<void>();

  readonly loading = signal(false);

  readonly assets = computed<QuickPickerAsset[]>(() => {
    const seen = new Set<string>();
    const items: QuickPickerAsset[] = [];

    for (const asset of collectBuildBookTemplateCoreImages(this.templateId())) {
      items.push({
        id: asset.id,
        url: asset.url,
        label: asset.label,
        source: 'template',
      });
      seen.add(asset.url);
    }

    for (const asset of this.studio.assets()) {
      if (seen.has(asset.url)) continue;
      items.push({
        id: asset.id,
        url: asset.url,
        label: asset.label || asset.originalFilename || 'Site image',
        source: asset.source === 'generated' ? 'generated' : 'uploaded',
      });
      seen.add(asset.url);
    }

    return items;
  });

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
