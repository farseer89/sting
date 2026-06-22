import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { ProspectorRunDto, ProspectorScoredLead } from './prospector-run.model';

@Component({
  selector: 'app-protopipe-prospector-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="res-wrap">
      @if (leads().length === 0) {
        <div class="res-empty">
          <p>No businesses found for this search. Try a broader category or location.</p>
        </div>
      } @else {
        <div class="res-header">
          <span class="res-count">{{ leads().length }} businesses found</span>
          @if (run().totalCostUsd && run().totalCostUsd! > 0) {
            <span class="res-cost">Search cost: {{ formatCost(run().totalCostUsd) }}</span>
          }
        </div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th class="tbl-th tbl-th--score">Score</th>
                <th class="tbl-th">Business</th>
                <th class="tbl-th tbl-th--rating">Rating</th>
                <th class="tbl-th tbl-th--web">Website</th>
                <th class="tbl-th tbl-th--factors">Factors</th>
                <th class="tbl-th tbl-th--links">Links</th>
              </tr>
            </thead>
            <tbody>
              @for (lead of leads(); track lead.placeId) {
                <tr class="tbl-row" [class]="'tbl-row--' + lead.priority">
                  <td class="tbl-td tbl-td--score">
                    <span class="score-num" [class]="'score-num--' + lead.priority">{{ lead.score }}</span>
                    <span class="priority-label" [class]="'priority-label--' + lead.priority">{{ lead.priority }}</span>
                  </td>
                  <td class="tbl-td tbl-td--biz">
                    <span class="biz-name">{{ lead.displayName ?? '—' }}</span>
                    @if (lead.formattedAddress) {
                      <span class="biz-addr">{{ lead.formattedAddress }}</span>
                    }
                    @if (lead.internationalPhoneNumber) {
                      <span class="biz-phone">{{ lead.internationalPhoneNumber }}</span>
                    }
                  </td>
                  <td class="tbl-td tbl-td--rating">
                    @if (lead.rating) {
                      <span class="rating">★ {{ lead.rating.toFixed(1) }}</span>
                      @if (lead.userRatingCount) {
                        <span class="rating-count">({{ lead.userRatingCount }})</span>
                      }
                    } @else {
                      <span class="rating-none">—</span>
                    }
                  </td>
                  <td class="tbl-td tbl-td--web">
                    @if (lead.websiteQuality === 'none') {
                      <span class="web-badge web-badge--none">No site</span>
                    } @else if (lead.websiteUri) {
                      <a class="web-badge web-badge--yes" [href]="lead.websiteUri" target="_blank" rel="noopener">Has site ↗</a>
                    } @else {
                      <span class="web-badge web-badge--yes">Has site</span>
                    }
                  </td>
                  <td class="tbl-td tbl-td--factors">
                    <div class="factors">
                      @for (b of lead.scoreBreakdown; track b.label) {
                        <span class="factor">{{ b.label }} <em>+{{ b.pts }}</em></span>
                      }
                    </div>
                  </td>
                  <td class="tbl-td tbl-td--links">
                    @if (lead.googleMapsUri) {
                      <a class="map-link" [href]="lead.googleMapsUri" target="_blank" rel="noopener">Maps ↗</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styleUrl: './protopipe-prospector-results.component.scss',
})
export class ProtopipeProspectorResultsComponent {
  readonly run = input.required<ProspectorRunDto>();

  readonly leads = computed((): ProspectorScoredLead[] => {
    return (this.run().artifacts?.scoredLeads ?? []).slice().sort((a, b) => b.score - a.score);
  });

  formatCost(usd: number | undefined | null): string {
    if (!usd || usd === 0) return '';
    if (usd < 0.01) return `$${(usd * 1000).toFixed(3)}m`;
    return `$${usd.toFixed(4)}`;
  }
}
