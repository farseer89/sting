import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-protopipe-image-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './image-placeholder.component.html',
  styleUrl: './image-placeholder.component.scss',
})
export class ProtopipeImagePlaceholderComponent {
  readonly label = input('Image');
  readonly hint = input('Upload an image or add a URL');
  readonly url = input('');
  readonly alt = input('');
  readonly readOnly = input(false);
  readonly uploading = input(false);
  readonly compact = input(false);

  readonly urlChange = output<string>();
  readonly altChange = output<string>();
  readonly upload = output<void>();
  readonly remove = output<void>();

  hasPreview(): boolean {
    return Boolean(this.url()?.trim());
  }

  needsAlt(): boolean {
    return Boolean(this.url()?.trim() && !this.alt()?.trim());
  }
}
