import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MediaStudioImageSize, MediaStudioKind } from '@hive/contracts';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { ProtopipeMediaStudioService } from '../../protopipe-media-studio.service';

interface KindChoice {
  label: string;
  value: MediaStudioKind;
}

@Component({
  selector: 'app-protopipe-media-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Textarea, SelectButton, InputNumber, ProgressSpinner, Message],
  templateUrl: './protopipe-media-studio.component.html',
  styleUrl: './protopipe-media-studio.component.scss',
})
export class ProtopipeMediaStudioComponent implements OnInit {
  private readonly studio = inject(ProtopipeMediaStudioService);

  readonly loadingConfig = this.studio.loadingConfig;
  readonly generating = this.studio.generating;
  readonly error = this.studio.error;
  readonly config = this.studio.config;
  readonly lastResult = this.studio.lastResult;

  readonly kind = signal<MediaStudioKind>('logo');
  readonly prompt = signal('');
  readonly numImages = signal(2);

  readonly kindChoices = computed<KindChoice[]>(() =>
    (this.config()?.kinds ?? []).map((k) => ({ label: k.label, value: k.kind })),
  );

  readonly selectedKindMeta = computed(() => this.studio.kindOption(this.kind()));

  readonly falReady = computed(() => this.config()?.falConfigured === true);

  async ngOnInit(): Promise<void> {
    await this.studio.loadConfig();
  }

  onKindChange(value: MediaStudioKind): void {
    this.kind.set(value);
  }

  async generate(): Promise<void> {
    const meta = this.selectedKindMeta();
    if (!meta || !this.prompt().trim()) return;

    await this.studio.generate({
      kind: this.kind(),
      prompt: this.prompt().trim(),
      imageSize: meta.defaultImageSize as MediaStudioImageSize,
      numImages: Math.min(Math.max(this.numImages(), 1), meta.maxVariants),
    });
  }
}
