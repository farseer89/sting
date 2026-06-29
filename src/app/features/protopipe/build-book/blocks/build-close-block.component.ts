import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { BuildBookWireLayout } from '../build-book.types';
import { ProtopipeBuildInlineTextComponent } from '../inline/build-inline-text.component';
import { ProtopipeBuildInlineCtaComponent } from '../inline/build-inline-cta.component';
import { patchProp } from '../fields/build-field.util';
import { readHeading, readPrimaryCta, readSecondaryCta, readSubmitLabel, readSubhead } from '../canvas/build-block-renderer.registry';

@Component({
  selector: 'app-protopipe-build-close-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildInlineTextComponent, ProtopipeBuildInlineCtaComponent],
  templateUrl: './build-close-block.component.html',
  styleUrl: './build-close-block.component.scss',
})
export class ProtopipeBuildCloseBlockComponent {
  readonly layout = input<BuildBookWireLayout>('close-form');
  readonly props = input<Record<string, unknown>>({});
  readonly editable = input(false);

  readonly propsChange = output<Record<string, unknown>>();
  readonly propPathChange = output<{ path: string; value: unknown }>();

  readonly heading = computed(() => readHeading(this.props(), 'Ready to get started?'));
  readonly body = computed(() => readSubhead(this.props(), 'Tell us about your project.'));
  readonly subhead = computed(() => String(this.props()['subhead'] ?? ''));
  readonly primaryCta = computed(() => readPrimaryCta(this.props(), 'Request a quote'));
  readonly secondaryCta = computed(() => readSecondaryCta(this.props(), 'Call us'));
  readonly submitLabel = computed(() => readSubmitLabel(this.props()));

  patchProp(key: string, value: string): void {
    this.propsChange.emit(patchProp(this.props(), key, value));
  }
}
