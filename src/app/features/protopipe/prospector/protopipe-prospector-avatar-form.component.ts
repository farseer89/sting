import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
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
import type { GooglePlaceLocationOption, ProtopipeSerpLocationOption } from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { isShirePrimary } from '../shire/shire-http.util';
import { ProtopipeProspectorShireApiService } from './protopipe-prospector-shire-api.service';

type ProspectorLocationOption = GooglePlaceLocationOption | ProtopipeSerpLocationOption;

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

          <span class="af-flow-arrow" aria-hidden="true">→</span>

          <div class="af-field">
            <label class="af-label" for="pp-location">Location</label>
            <p-autocomplete
              inputId="pp-location"
              styleClass="af-location-ac"
              [suggestions]="locationSuggestions()"
              [(ngModel)]="locationText"
              name="location"
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

          <span class="af-flow-arrow" aria-hidden="true">→</span>

          <button
            type="submit"
            class="af-submit"
            [disabled]="loading() || !canSubmit()"
          >
            @if (loading()) {
              <span class="af-submit__spinner"></span>
              Searching
            } @else {
              Search
            }
          </button>
        </form>

        @if (error()) {
          <p class="af-error af-error--below">{{ error() }}</p>
        }
      </div>
    </div>
  `,
  styleUrl: './protopipe-prospector-avatar-form.component.scss',
})
export class ProtopipeProspectorAvatarFormComponent implements DoCheck {
  private readonly api = inject(ProtopipeApiService);
  private readonly shireApi = inject(ProtopipeProspectorShireApiService);
  private readonly shirePrimary = isShirePrimary();

  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly searchRequested = output<{ category: string; location: string }>();

  category = '';
  locationText = '';
  private selectedLocation: ProspectorLocationOption | null = null;

  readonly locationSuggestions = signal<ProspectorLocationOption[]>([]);
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
      const res = this.shirePrimary
        ? await this.shireApi.searchPlaceLocations(q, 8)
        : await this.api.searchSerpLocations(q, 8);
      this.locationSuggestions.set(res.locations);
    } catch {
      this.locationSuggestions.set([]);
    }
  }

  onLocationSelected(event: AutoCompleteSelectEvent): void {
    const opt = event.value as ProspectorLocationOption | null;
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
    this.searchRequested.emit({ category: this.category.trim(), location });
  }
}
