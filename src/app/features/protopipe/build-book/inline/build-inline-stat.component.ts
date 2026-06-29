import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProtopipeBuildInlineTextComponent } from './build-inline-text.component';

@Component({
  selector: 'app-protopipe-build-inline-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeBuildInlineTextComponent],
  template: `
    <div [class]="hostClass()">
      <app-protopipe-build-inline-text
        [editable]="editable()"
        [value]="value()"
        hostClass="bb-inline-stat__value"
        ariaLabel="Stat value"
        (valueChange)="valueChange.emit($event)"
      />
      <app-protopipe-build-inline-text
        [editable]="editable()"
        [value]="label()"
        hostClass="bb-inline-stat__label"
        ariaLabel="Stat label"
        (valueChange)="labelChange.emit($event)"
      />
    </div>
  `,
  styleUrl: './build-inline-stat.component.scss',
})
export class ProtopipeBuildInlineStatComponent {
  readonly value = input('');
  readonly label = input('');
  readonly editable = input(false);
  readonly hostClass = input('bb-inline-stat');

  readonly valueChange = output<string>();
  readonly labelChange = output<string>();
}
