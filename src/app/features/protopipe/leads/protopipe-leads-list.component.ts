import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ProtopipeLeadsService } from './protopipe-leads.service';

@Component({
  selector: 'app-protopipe-leads-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, Button, Tag, ProgressSpinner, Drawer],
  template: `
    <div class="leads-page">
      <header class="page-header">
        <h1>Leads</h1>
        <p class="sub">Inquiries from your landing page lead capture forms (all sites).</p>
      </header>

      @if (leads.loading()) {
        <p-progressSpinner ariaLabel="Loading" />
      } @else if (leads.error(); as err) {
        <p class="error">{{ err }}</p>
      } @else {
        <p-table
          [value]="leads.leads()"
          [rows]="20"
          [paginator]="leads.leads().length > 20"
          styleClass="leads-table desktop-only"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-lead>
            <tr (click)="leads.selectLead(lead)" class="row-click">
              <td>{{ lead.email ?? '—' }}</td>
              <td>{{ lead.name ?? '—' }}</td>
              <td><p-tag [value]="lead.status" [severity]="statusSeverity(lead.status)" /></td>
              <td>{{ formatDate(lead.createdAt) }}</td>
            </tr>
          </ng-template>
        </p-table>

        <div class="leads-cards mobile-only">
          @for (lead of leads.leads(); track lead.id) {
            <button type="button" class="lead-card" (click)="leads.selectLead(lead)">
              <strong>{{ lead.email ?? 'No email' }}</strong>
              <span>{{ lead.name ?? '—' }}</span>
              <p-tag [value]="lead.status" [severity]="statusSeverity(lead.status)" />
            </button>
          }
        </div>
      }

      <p-drawer
        [visible]="!!leads.selected()"
        (visibleChange)="onDrawerVisible($event)"
        position="right"
        [style]="{ width: 'min(100%, 24rem)' }"
        header="Lead detail"
      >
        @if (leads.selected(); as lead) {
          <dl class="detail-dl">
            <dt>Email</dt>
            <dd>{{ lead.email ?? '—' }}</dd>
            <dt>Name</dt>
            <dd>{{ lead.name ?? '—' }}</dd>
            <dt>Message</dt>
            <dd>{{ lead.message ?? '—' }}</dd>
            <dt>Status</dt>
            <dd>{{ lead.status }}</dd>
            <dt>Received</dt>
            <dd>{{ formatDate(lead.createdAt) }}</dd>
          </dl>
          @if (lead.status !== 'converted') {
            <p-button
              label="Convert to client"
              (onClick)="convert()"
              [loading]="leads.converting()"
              styleClass="w-full"
            />
          }
          @if (leads.convertResult(); as msg) {
            <p class="convert-msg">{{ msg }}</p>
          }
        }
      </p-drawer>
    </div>
  `,
  styles: `
    .page-header {
      margin-bottom: 1rem;
    }
    .sub {
      color: var(--text-color-secondary);
    }
    .row-click {
      cursor: pointer;
    }
    .detail-dl dt {
      font-weight: 600;
      margin-top: 0.75rem;
    }
    .detail-dl dd {
      margin: 0.25rem 0 0;
    }
    .convert-msg {
      margin-top: 1rem;
      font-size: 0.85rem;
      word-break: break-all;
    }
    .leads-cards {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .lead-card {
      text-align: left;
      padding: 1rem;
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      background: var(--surface-card);
      min-height: 44px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .mobile-only {
      display: flex;
    }
    .desktop-only {
      display: none;
    }
    @media (min-width: 48rem) {
      .mobile-only {
        display: none;
      }
      .desktop-only {
        display: table;
      }
    }
    .error {
      color: var(--red-500);
    }
  `,
})
export class ProtopipeLeadsListComponent implements OnInit {
  protected readonly leads = inject(ProtopipeLeadsService);

  ngOnInit(): void {
    void this.leads.ensureLoaded();
  }

  onDrawerVisible(visible: boolean): void {
    if (!visible) this.leads.selectLead(null);
  }

  convert(): void {
    void this.leads.convertSelected();
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' | 'info' {
    if (status === 'converted') return 'success';
    if (status === 'new') return 'info';
    if (status === 'reviewed') return 'warn';
    return 'secondary';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
