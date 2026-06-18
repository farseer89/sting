import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import type { PitchProspectStatus } from '@hive/contracts';
import { ProtopipePitchProspectService } from './protopipe-pitch-prospect.service';

@Component({
  selector: 'app-protopipe-pitch-prospect-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Button, Dialog, InputText, ProgressSpinner, TableModule, Tag],
  templateUrl: './protopipe-pitch-prospect-board.component.html',
  styleUrl: './protopipe-pitch-prospect-board.component.scss',
})
export class ProtopipePitchProspectBoardComponent implements OnInit {
  private readonly router = inject(Router);
  readonly prospectsSvc = inject(ProtopipePitchProspectService);

  readonly showAdd = signal(false);
  readonly newName = signal('');
  readonly newUrl = signal('');
  readonly creating = signal(false);

  ngOnInit(): void {
    void this.prospectsSvc.loadList();
  }

  statusSeverity(status: PitchProspectStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ready':
        return 'success';
      case 'generating':
      case 'ingesting':
        return 'warn';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  openAdd(): void {
    this.newName.set('');
    this.newUrl.set('');
    this.showAdd.set(true);
  }

  async createProspect(): Promise<void> {
    const name = this.newName().trim();
    const sourceUrl = this.newUrl().trim();
    if (!name || !sourceUrl) return;

    this.creating.set(true);
    const prospect = await this.prospectsSvc.create({ name, sourceUrl });
    this.creating.set(false);

    if (prospect) {
      this.showAdd.set(false);
      void this.router.navigate(['/protopipe/pitch-prep', prospect.id, 'wizard']);
    }
  }

  openProspect(prospectId: string): void {
    void this.router.navigate(['/protopipe/pitch-prep', prospectId, 'wizard']);
  }
}
