import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import type { ProtopipeLead, ProtopipeLeadStatus } from '@hive/contracts';
import { ProtopipeLeadsService } from './protopipe-leads.service';

@Component({
  selector: 'app-protopipe-leads-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protopipe-leads-list.component.html',
  styleUrl: './protopipe-leads-list.component.scss',
})
export class ProtopipeLeadsListComponent implements OnInit {
  protected readonly leads = inject(ProtopipeLeadsService);

  ngOnInit(): void {
    void this.leads.ensureLoaded();
  }

  selectLead(lead: ProtopipeLead): void {
    this.leads.selectLead(lead);
  }

  closeDetail(): void {
    this.leads.selectLead(null);
  }

  convert(): void {
    void this.leads.convertSelected();
  }

  statusClass(status: ProtopipeLeadStatus): string {
    return `strat-leads__status--${status}`;
  }

  statusLabel(status: ProtopipeLeadStatus): string {
    return status;
  }

  formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateLong(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
