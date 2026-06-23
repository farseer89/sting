import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ProtopipeProspectorService } from './protopipe-prospector.service';
import { ProtopipeProspectorAvatarFormComponent } from './protopipe-prospector-avatar-form.component';
import { ProtopipeHomeThinkerViewState } from '../home/protopipe-home-thinker-view.state';

@Component({
  selector: 'app-protopipe-prospector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtopipeProspectorAvatarFormComponent],
  template: `
    <div class="psp-shell">
      <div class="psp-masthead">
        <div>
          <h1 class="psp-masthead__title">Prospector</h1>
          <p class="psp-masthead__deck">Find and score local businesses for outbound pitch.</p>
        </div>
      </div>

      <div class="psp-body">
        <app-protopipe-prospector-avatar-form
          [loading]="launching()"
          [error]="launchError()"
          (search)="onSearch($event)"
        />
      </div>
    </div>
  `,
  styleUrl: './protopipe-prospector.component.scss',
})
export class ProtopipeProspectorComponent {
  private readonly service = inject(ProtopipeProspectorService);
  private readonly thinkerView = inject(ProtopipeHomeThinkerViewState);

  readonly launching = signal(false);
  readonly launchError = signal<string | null>(null);

  async onSearch(input: { category: string; location: string }): Promise<void> {
    this.launching.set(true);
    this.launchError.set(null);

    try {
      const run = await this.service.createRun(input.category, input.location);
      this.thinkerView.openProspectorRun(run);
    } catch {
      this.launchError.set('Failed to start search. Please try again.');
    } finally {
      this.launching.set(false);
    }
  }
}
