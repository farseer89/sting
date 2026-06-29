import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-protopipe-build-image-target',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="bb-image-target"
      [class.bb-image-target--editable]="editable()"
      [class]="hostClass()"
      [disabled]="!editable()"
      [attr.aria-label]="ariaLabel()"
      (click)="onClick($event)"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './build-image-target.component.scss',
})
export class ProtopipeBuildImageTargetComponent {
  readonly editable = input(false);
  readonly hostClass = input('');
  readonly ariaLabel = input('Edit image');

  readonly imageEdit = output<void>();

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.editable()) return;
    this.imageEdit.emit();
  }
}
