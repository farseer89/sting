import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { formatMarketNumber } from '../protopipe-market-display';
import { ProtopipeResearchService } from './protopipe-research.service';

const GEO_OPTIONS = [
  { id: '2840', label: 'United States' },
  { id: '2124', label: 'Canada' },
  { id: '2826', label: 'United Kingdom' },
  { id: '2036', label: 'Australia' },
  { id: '21144', label: 'Hawaii, United States' },
];

@Component({
  selector: 'app-protopipe-research',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Button, Card, InputText, Select, TableModule, Tag, Toast, ProgressSpinner],
  providers: [MessageService],
  templateUrl: './protopipe-research.component.html',
  styleUrl: './protopipe-research.component.scss',
})
export class ProtopipeResearchComponent implements OnInit {
  private readonly research = inject(ProtopipeResearchService);
  private readonly messages = inject(MessageService);
  readonly loading = this.research.loading;
  readonly error = this.research.error;
  readonly result = this.research.result;
  readonly googleStatus = this.research.googleStatus;
  readonly addingPhrase = this.research.addingPhrase;
  readonly phrase = signal('');
  readonly geoTargetId = signal('2840');
  readonly languageCode = signal('en');
  readonly geoOptions = GEO_OPTIONS;
  readonly formatNumber = formatMarketNumber;
  ngOnInit(): void { void this.research.ensureContext(); }
  async onSearch(): Promise<void> {
    if (await this.research.search({ phrase: this.phrase(), geoTargetId: this.geoTargetId(), languageCode: this.languageCode() })) {
      this.messages.add({ severity: 'success', summary: 'Research complete' });
    }
  }
  async addToPlan(phrase: string): Promise<void> {
    const ok = await this.research.addPhraseToPlan(phrase);
    this.messages.add({ severity: ok ? 'success' : 'warn', summary: ok ? 'Added to keyword plan' : 'Could not add keyword', detail: ok ? undefined : this.error() ?? undefined });
  }
  microsToUsd(micros?: number): string { return micros == null ? '—' : '$' + (micros / 1e6).toFixed(2); }
  formatPct(value?: number): string { return value == null ? '—' : (value * 100).toFixed(1) + '%'; }
}
