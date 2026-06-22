import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type {
  ProspectorRunDto,
  ProspectorScoredLead,
  ProspectorLeadPitch,
} from './prospector-run.model';

@Component({
  selector: 'app-protopipe-prospector-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="res-wrap">
      @if (leads().length === 0 && run().status !== 'complete') {
        <div class="res-empty">
          <p>Scoring leads…</p>
        </div>
      } @else if (leads().length === 0) {
        <div class="res-empty">
          <p>No businesses found for this search. Try a broader category or location.</p>
        </div>
      } @else {
        <div class="res-grid">
          @for (lead of leads(); track lead.placeId) {
            <div class="lc" [class]="'lc--' + lead.priority">
              <!-- Score badge -->
              <div class="lc__badge">
                <span class="lc__score">{{ lead.score }}</span>
                <span class="lc__priority">{{ lead.priority }}</span>
              </div>

              <!-- Main info -->
              <div class="lc__body">
                <div class="lc__head">
                  <h3 class="lc__name">{{ lead.displayName ?? 'Unknown' }}</h3>
                  <div class="lc__chips">
                    @if (lead.rating) {
                      <span class="lc__chip">
                        ★ {{ lead.rating.toFixed(1) }}
                        @if (lead.userRatingCount) { ({{ lead.userRatingCount }}) }
                      </span>
                    }
                    <span class="lc__chip lc__chip--web" [class.lc__chip--no-web]="lead.websiteQuality === 'none'">
                      {{ lead.websiteQuality === 'none' ? 'No website' : 'Has website' }}
                    </span>
                    @if (lead.googleMapsUri) {
                      <a class="lc__chip lc__chip--link" [href]="lead.googleMapsUri" target="_blank" rel="noopener">
                        Maps ↗
                      </a>
                    }
                  </div>
                  @if (lead.formattedAddress) {
                    <p class="lc__addr">{{ lead.formattedAddress }}</p>
                  }
                  @if (lead.internationalPhoneNumber) {
                    <p class="lc__phone">{{ lead.internationalPhoneNumber }}</p>
                  }
                </div>

                <!-- Score breakdown -->
                <div class="lc__breakdown">
                  @for (b of lead.scoreBreakdown; track b.label) {
                    <span class="lc__gap">{{ b.label }} <em>+{{ b.pts }}</em></span>
                  }
                </div>

                <!-- Pitch copy (once available) -->
                @if (pitchFor(lead.placeId); as pitch) {
                  @if (pitch.pitchLines.length > 0) {
                    <div class="lc__pitch">
                      @for (line of pitch.pitchLines; track $index) {
                        <p class="lc__pitch-line">{{ line }}</p>
                      }
                    </div>
                  }
                } @else if (run().status === 'running' && run().currentStep === 'generate_pitch') {
                  <div class="lc__pitch-pending">Generating pitch…</div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './protopipe-prospector-results.component.scss',
})
export class ProtopipeProspectorResultsComponent {
  readonly run = input.required<ProspectorRunDto>();

  readonly leads = computed((): ProspectorScoredLead[] => {
    return this.run().artifacts?.scoredLeads ?? [];
  });

  private readonly pitchMap = computed((): Map<string, ProspectorLeadPitch> => {
    const map = new Map<string, ProspectorLeadPitch>();
    for (const p of this.run().artifacts?.pitchCopy ?? []) {
      map.set(p.placeId, p);
    }
    return map;
  });

  pitchFor(placeId: string): ProspectorLeadPitch | null {
    return this.pitchMap().get(placeId) ?? null;
  }
}
