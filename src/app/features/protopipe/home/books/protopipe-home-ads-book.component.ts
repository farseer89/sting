import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ProtopipeGeoTargetOption } from '@hive/contracts';
import { AutoComplete, type AutoCompleteCompleteEvent, type AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { formatMarketNumber } from '../../protopipe-market-display';
import { formatKeywordVolume } from '../keyword-picker/keyword-picker.types';
import {
  SIMULATOR_BUDGET_PRESETS,
  isKeywordOverBudget,
  type AdsBookProduct,
  type AdsVerdict,
} from './ads-book-economics';
import {
  ProtopipeAdsBookStore,
  type AdsBookSection,
} from './protopipe-ads-book.store';

@Component({
  selector: 'app-protopipe-home-ads-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeAdsBookStore],
  imports: [FormsModule, RouterLink, NgTemplateOutlet, AutoComplete, Button, ProgressSpinner],
  templateUrl: './protopipe-home-ads-book.component.html',
  styleUrl: './protopipe-home-ads-book.component.scss',
})
export class ProtopipeHomeAdsBookComponent implements OnInit {
  readonly store = inject(ProtopipeAdsBookStore);
  readonly newKeyword = signal('');
  readonly budgetPresets = SIMULATOR_BUDGET_PRESETS;

  readonly formatNumber = formatMarketNumber;
  readonly formatVolume = formatKeywordVolume;

  ngOnInit(): void {
    void this.store.ensureContext();
  }

  selectSection(section: AdsBookSection): void {
    this.store.setSection(section);
  }

  onSearchInput(value: string): void {
    this.store.setSearchQuery(value);
  }

  clearSearch(): void {
    this.store.clearSearch();
  }

  onGeoComplete(event: AutoCompleteCompleteEvent): void {
    this.store.searchGeoSuggestions(event.query);
  }

  onGeoSelect(event: AutoCompleteSelectEvent): void {
    const option = event.value as ProtopipeGeoTargetOption;
    if (option?.id) {
      this.store.setGeoSelection(option);
    }
  }

  onCityInputChange(value: string): void {
    this.store.setCityInput(value);
  }

  countryLabel(code: string): string {
    return this.store.geoCountries.find((c) => c.code === code)?.label ?? code;
  }

  microsToUsd(micros?: number): string {
    return micros == null ? '—' : '$' + (micros / 1e6).toFixed(2);
  }

  cpcRange(low?: number, high?: number): string {
    if (low == null && high == null) return '—';
    return `${this.microsToUsd(low)} – ${this.microsToUsd(high)}`;
  }

  competitionLabel(competition?: string, index?: number): string {
    if (competition) return competition.toUpperCase();
    if (index != null) return String(Math.round(index));
    return '—';
  }

  priorityLabel(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  usd(value: number | undefined | null): string {
    if (value == null || !Number.isFinite(value)) return '—';
    return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  usdPrecise(value: number | undefined | null): string {
    if (value == null || !Number.isFinite(value)) return '—';
    return '$' + value.toFixed(2);
  }

  pct(value: number): string {
    return Math.round(value * 100) + '%';
  }

  verdictLabel(verdict: AdsVerdict): string {
    if (verdict === 'go') return 'Go';
    if (verdict === 'marginal') return 'Marginal';
    return 'No-go';
  }

  onProductFieldChange(product: AdsBookProduct, field: 'name' | 'priceUsd' | 'marginUsd', value: string | number): void {
    if (field === 'name') {
      this.store.updateProduct(product.id, { name: String(value) });
      return;
    }
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return;
    this.store.updateProduct(product.id, { [field]: num });
  }

  submitKeyword(productId: string): void {
    const phrase = this.newKeyword().trim();
    if (!phrase) return;
    void this.store.addProductKeyword(productId, phrase);
    this.newKeyword.set('');
  }

  maxCpcFor(product: AdsBookProduct): number {
    return this.store.maxAffordableCpcForProduct(product);
  }

  onAssumptionPctChange(field: 'clickToLeadRate' | 'leadToCloseRate' | 'marginShareForAds', pct: number | string): void {
    const n = typeof pct === 'number' ? pct : Number(pct);
    if (!Number.isFinite(n)) return;
    this.store.setAssumptions({ [field]: n / 100 });
  }

  onSimulatorCpcChange(value: string | number | null): void {
    if (value === '' || value == null) {
      this.store.setSimulatorCpcUsd(null);
      return;
    }
    const n = typeof value === 'number' ? value : Number(value);
    this.store.setSimulatorCpcUsd(Number.isFinite(n) ? n : null);
  }

  onPitchNumberChange(field: 'protopipeFeeUsd' | 'adSpendUsd' | 'allInMonthlyUsd', value: string | number): void {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    this.store.setPitchConfig({ [field]: n });
  }

  jobsLabel(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return value < 1 ? value.toFixed(1) : Math.ceil(value).toString();
  }

  roundCount(value: number): string {
    return this.formatNumber(Math.round(value));
  }

  isOverBudget(product: AdsBookProduct, phraseKey: string): boolean {
    const kw = product.keywords.find((k) => k.phraseKey === phraseKey);
    if (!kw) return false;
    return isKeywordOverBudget(kw, this.store.maxAffordableCpcForProduct(product));
  }
}
