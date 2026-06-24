import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProtopipeMerchBookProduct, ProtopipeMerchBookRunDto, ProtopipeMerchBookStationeryItem } from '@hive/contracts';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
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
  imports: [FormsModule, Button, Dialog, InputText, Textarea, Tag, ProgressSpinner],
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

  formatPrice(usd?: number): string {
    if (usd == null) return '—';
    return `$${usd.toFixed(2)}`;
  }

  productFor(run: ProtopipeMerchBookRunDto, productId: string): ProtopipeMerchBookProduct | undefined {
    return run.products.find((p) => p.id === productId);
  }

  mockupViewLabel(style: string): string {
    if (style.includes('Model')) return 'On model';
    if (style.includes('Flat')) return 'Flat lay';
    return style.replace(/\s*\(Printful\)\s*/i, '').trim();
  }

  formatDuration(ms?: number): string {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  onStationeryArtworkSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void this.store.uploadStationeryArtwork(file);
    input.value = '';
  }

  openStationeryPreview(item: ProtopipeMerchBookStationeryItem): void {
    void this.store.openStationeryPreview(item);
  }

  closeStationeryPreview(): void {
    this.store.closeStationeryPreview();
  }

  onStationeryPreviewDialogChange(visible: boolean): void {
    if (!visible) {
      this.closeStationeryPreview();
    }
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
