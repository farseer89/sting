import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  booleanAttribute,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
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
  imports: [FormsModule, Button, Dialog, InputText, ProgressSpinner, TableModule, Tag],
  templateUrl: './protopipe-pitch-prospect-board.component.html',
  styleUrl: './protopipe-pitch-prospect-board.component.scss',
})
export class ProtopipePitchProspectBoardComponent implements OnInit {
  private readonly router = inject(Router);
  readonly prospectsSvc = inject(ProtopipePitchProspectService);

  readonly embedded = input(false, { transform: booleanAttribute });
  readonly openProspect = output<string>();

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
      this.navigateToProspect(prospect.id);
    }
  }

  openProspectRow(prospectId: string): void {
    this.navigateToProspect(prospectId);
  }

  private navigateToProspect(prospectId: string): void {
    if (this.embedded()) {
      this.openProspect.emit(prospectId);
      return;
    }
    void this.router.navigate(['/home/pitch-prep', prospectId, 'wizard']);
  }
}
