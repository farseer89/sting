import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-protopipe-prospector-avatar-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="af-wrap">
      <div class="af-card">
        <div class="af-card__header">
          <h2 class="af-title">Customer avatar</h2>
          <p class="af-subtitle">Define who you're pitching to. Prospector will find and score real businesses.</p>
        </div>

        <form class="af-form" (ngSubmit)="onSubmit()">
          <div class="af-field">
            <label class="af-label" for="category">Business category</label>
            <input
              id="category"
              class="af-input"
              type="text"
              placeholder="e.g. Electricians, Plumbers, HVAC companies"
              [(ngModel)]="category"
              name="category"
              autocomplete="off"
              [disabled]="loading()"
            />
          </div>

          <div class="af-field">
            <label class="af-label" for="location">Location</label>
            <input
              id="location"
              class="af-input"
              type="text"
              placeholder="e.g. Chandler, AZ  or  Phoenix metro"
              [(ngModel)]="location"
              name="location"
              autocomplete="off"
              [disabled]="loading()"
            />
          </div>

          @if (error()) {
            <p class="af-error">{{ error() }}</p>
          }

          <button
            type="submit"
            class="af-submit"
            [disabled]="loading() || !canSubmit()"
          >
            @if (loading()) {
              <span class="af-submit__spinner"></span>
              Searching…
            } @else {
              Find businesses
            }
          </button>
        </form>

        <div class="af-hints">
          <span class="af-hint">Google Places API</span>
          <span class="af-hint-sep">·</span>
          <span class="af-hint">~$0.032 per search</span>
          <span class="af-hint-sep">·</span>
          <span class="af-hint">Up to 20 results</span>
        </div>
      </div>
    </div>
  `,
  styleUrl: './protopipe-prospector-avatar-form.component.scss',
})
export class ProtopipeProspectorAvatarFormComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly search = output<{ category: string; location: string }>();

  category = '';
  location = '';

  readonly canSubmit = signal(false);

  // Recompute canSubmit on every change since we're using template-driven forms
  ngDoCheck(): void {
    this.canSubmit.set(this.category.trim().length > 0 && this.location.trim().length > 0);
  }

  onSubmit(): void {
    if (!this.canSubmit() || this.loading()) return;
    this.search.emit({ category: this.category.trim(), location: this.location.trim() });
  }
}
