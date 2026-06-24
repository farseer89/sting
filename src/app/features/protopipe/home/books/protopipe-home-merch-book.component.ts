import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ProtopipeMerchBookStore, type MerchBookSection } from './protopipe-merch-book.store';

@Component({
  selector: 'app-protopipe-home-merch-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeMerchBookStore],
  imports: [FormsModule, Button, InputText, Textarea, Tag, ProgressSpinner],
  templateUrl: './protopipe-home-merch-book.component.html',
  styleUrl: './protopipe-home-merch-book.component.scss',
})
export class ProtopipeHomeMerchBookComponent implements OnInit {
  readonly store = inject(ProtopipeMerchBookStore);

  ngOnInit(): void {
    void this.store.ensureContext();
  }

  selectSection(section: MerchBookSection): void {
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
    if (status === 'complete' || status === 'ready' || status === 'selected') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'pending' || status === 'running') return 'warn';
    return 'secondary';
  }

  trainSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    if (status === 'complete') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'running') return 'warn';
    return 'secondary';
  }
}
