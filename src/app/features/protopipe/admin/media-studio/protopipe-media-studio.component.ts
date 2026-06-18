import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MediaStudioImageSize, MediaStudioKind, MediaStudioModelOption } from '@hive/contracts';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { ProtopipeMediaStudioService } from '../../protopipe-media-studio.service';

interface KindChoice {
  label: string;
  value: MediaStudioKind;
}

interface ModelChoice extends MediaStudioModelOption {
  priceLabel: string;
  displayLabel: string;
}

@Component({
  selector: 'app-protopipe-media-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Textarea, SelectButton, Select, InputNumber, ProgressSpinner, Message],
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
  readonly model = signal('');
  readonly prompt = signal('');
  readonly numImages = signal(2);

  readonly kindChoices = computed<KindChoice[]>(() =>
    (this.config()?.kinds ?? []).map((k) => ({ label: k.label, value: k.kind })),
  );

  readonly selectedKindMeta = computed(() => this.studio.kindOption(this.kind()));

  readonly modelChoices = computed<ModelChoice[]>(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return (cfg.models ?? [])
      .filter((m) => m.kinds.includes(this.kind()))
      .map((m) => ({
        ...m,
        priceLabel: formatUnitPrice(m.unitPrice, m.unit, m.currency),
        displayLabel: `${m.label} — ${formatUnitPrice(m.unitPrice, m.unit, m.currency)}`,
      }));
  });

  readonly selectedModelMeta = computed(() =>
    this.modelChoices().find((m) => m.id === this.model()),
  );

  readonly falReady = computed(() => this.config()?.falConfigured === true);

  constructor() {
    effect(() => {
      const meta = this.selectedKindMeta();
      const choices = this.modelChoices();
      if (!meta || !choices.length) return;
      const current = this.model();
      if (!choices.some((c) => c.id === current)) {
        const preferred = choices.find((c) => c.id === meta.defaultModel) ?? choices[0];
        this.model.set(preferred.id);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.studio.loadConfig();
  }

  onKindChange(value: MediaStudioKind): void {
    this.kind.set(value);
  }

  formatCost(): string {
    const cost = this.lastResult()?.cost;
    if (!cost) return '';
    const prefix = cost.estimated ? '~' : '';
    const units =
      cost.billableUnits !== null
        ? `${cost.billableUnits} ${cost.unit}${cost.billableUnits === 1 ? '' : 's'}`
        : `estimated ${cost.unit}s`;
    return `${prefix}$${cost.totalUsd.toFixed(4)} ${cost.currency} (${units} × $${cost.unitPrice}/${cost.unit})`;
  }

  configReady = computed(() => {
    const cfg = this.config();
    return Boolean(cfg?.kinds?.length && cfg?.models?.length);
  });

  async generate(): Promise<void> {
    const meta = this.selectedKindMeta();
    const modelId = this.model().trim();
    if (!meta || !modelId || !this.prompt().trim()) return;

    await this.studio.generate({
      kind: this.kind(),
      model: modelId,
      prompt: this.prompt().trim(),
      imageSize: meta.defaultImageSize as MediaStudioImageSize,
      numImages: Math.min(Math.max(this.numImages(), 1), meta.maxVariants),
    });
  }
}

function formatUnitPrice(unitPrice: number, unit: string, currency: string): string {
  const formatted = unitPrice < 0.01 ? unitPrice.toFixed(4) : unitPrice.toFixed(3);
  return `$${formatted}/${unit} ${currency}`;
}
