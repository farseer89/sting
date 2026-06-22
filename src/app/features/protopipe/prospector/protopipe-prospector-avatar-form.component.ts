import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AutoComplete,
  type AutoCompleteCompleteEvent,
  type AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import type { ProtopipeSerpLocationOption } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';

@Component({
  selector: 'app-protopipe-prospector-avatar-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoComplete],
  template: `
    <div class="af-wrap">
      <div class="af-card">
        <div class="af-card__header">
          <h2 class="af-title">Customer avatar</h2>
          <p class="af-subtitle">Define who you're pitching to. Prospector will find and score real businesses.</p>
        </div>

        <form class="af-form" (ngSubmit)="onSubmit()">
          <div class="af-field">
            <label class="af-label" for="pp-category">Business category</label>
            <input
              id="pp-category"
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
            <label class="af-label" for="pp-location">Location</label>
            <p-autocomplete
              inputId="pp-location"
              styleClass="af-location-ac"
              [suggestions]="locationSuggestions()"
              (completeMethod)="searchLocations($event)"
              (onSelect)="onLocationSelected($event)"
              (onClear)="onLocationCleared()"
              field="name"
              optionLabel="name"
              placeholder="Start typing a city (e.g. Chandler, AZ)"
              [forceSelection]="false"
              [minLength]="2"
              [delay]="250"
              appendTo="body"
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
  private readonly api = inject(ProtopipeApiService);

  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly search = output<{ category: string; location: string }>();

  category = '';
  locationText = '';
  private selectedLocation: ProtopipeSerpLocationOption | null = null;

  readonly locationSuggestions = signal<ProtopipeSerpLocationOption[]>([]);
  readonly canSubmit = signal(false);

  ngDoCheck(): void {
    this.canSubmit.set(
      this.category.trim().length > 0 && this.locationText.trim().length > 0,
    );
  }

  async searchLocations(event: AutoCompleteCompleteEvent): Promise<void> {
    const q = event.query?.trim() ?? '';
    if (q.length < 2) {
      this.locationSuggestions.set([]);
      return;
    }
    try {
      const res = await this.api.searchSerpLocations(q, 8);
      this.locationSuggestions.set(res.locations);
    } catch {
      this.locationSuggestions.set([]);
    }
  }

  onLocationSelected(event: AutoCompleteSelectEvent): void {
    const opt = event.value as ProtopipeSerpLocationOption | null;
    this.selectedLocation = opt ?? null;
    this.locationText = opt?.name ?? '';
  }

  onLocationCleared(): void {
    this.selectedLocation = null;
    this.locationText = '';
  }

  onSubmit(): void {
    if (!this.canSubmit() || this.loading()) return;
    const location = this.selectedLocation?.name ?? this.locationText.trim();
    this.search.emit({ category: this.category.trim(), location });
  }
}
