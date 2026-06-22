import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { ProtopipeResearchBookStore, type ResearchBookSection } from './protopipe-research-book.store';

const MAX_PAGE_OPTIONS = [
  { label: '3 pages', value: 3 },
  { label: '5 pages', value: 5 },
  { label: '8 pages', value: 8 },
];

@Component({
  selector: 'app-protopipe-home-research-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeResearchBookStore],
  imports: [FormsModule, Button, InputText, Select, Tag, ProgressSpinner],
  templateUrl: './protopipe-home-research-book.component.html',
  styleUrl: './protopipe-home-research-book.component.scss',
})
export class ProtopipeHomeResearchBookComponent implements OnInit {
  readonly store = inject(ProtopipeResearchBookStore);
  readonly maxPageOptions = MAX_PAGE_OPTIONS;

  ngOnInit(): void {
    void this.store.ensureContext();
  }

  selectSection(section: ResearchBookSection): void {
    this.store.setSection(section);
  }

  formatCost(usd?: number): string {
    if (usd == null) return '—';
    return `$${usd.toFixed(3)}`;
  }

  formatDuration(ms?: number): string {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    if (status === 'complete') return 'success';
    if (status === 'failed') return 'danger';
    return 'secondary';
  }

  fetchSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    if (status === 'ok') return 'success';
    if (status === 'blocked') return 'warn';
    if (status === 'skipped') return 'secondary';
    return 'danger';
  }
}
