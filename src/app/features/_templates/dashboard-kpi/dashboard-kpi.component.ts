import { Component, inject, OnInit } from '@angular/core';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '@env/environment';

export interface DashboardStat {
  label: string;
  value: string;
  icon: string;
  hint: string;
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
}

export interface QuickAction {
  label: string;
  icon: string;
  description: string;
  disabled?: boolean;
}

export interface ActivityRow {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

@Component({
  selector: 'app-dashboard-kpi',
  standalone: true,
  imports: [Button, Tag, Divider, TableModule, Tooltip],
  templateUrl: './dashboard-kpi.component.html',
  styleUrl: './dashboard-kpi.component.scss',
})
export class DashboardKpiComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly appName = environment.appName;
  userDisplayName = 'User';
  userInitials = 'U';

  readonly stats: DashboardStat[] = [
    { label: 'Open jobs', value: '—', icon: 'pi pi-briefcase', hint: 'Connect a jobs API', severity: 'info' },
    { label: 'Equipment active', value: '—', icon: 'pi pi-truck', hint: 'Connect equipment API', severity: 'success' },
    { label: 'Pending tasks', value: '—', icon: 'pi pi-clock', hint: 'Placeholder KPI', severity: 'warn' },
    { label: 'Alerts', value: '—', icon: 'pi pi-exclamation-triangle', hint: 'Placeholder KPI', severity: 'danger' },
  ];

  readonly quickActions: QuickAction[] = [
    {
      label: 'Add feature route',
      icon: 'pi pi-plus',
      description: 'Register a lazy route under the shell in app.routes.ts',
    },
    {
      label: 'Update navigation',
      icon: 'pi pi-list',
      description: 'Edit navigation.service.ts for sidebar items',
    },
    {
      label: 'Configure environment',
      icon: 'pi pi-cog',
      description: 'Set MICRO_BASE_URL and run npm run configure-env',
    },
    {
      label: 'Deploy',
      icon: 'pi pi-cloud-upload',
      description: 'npm run deploy:firebase',
    },
  ];

  recentActivity: ActivityRow[] = [];

  ngOnInit(): void {
    this.userDisplayName = this.auth.getCurrentUserFullName();
    const parts = this.userDisplayName.trim().split(/\s+/);
    this.userInitials =
      parts.length >= 2
        ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
        : this.userDisplayName.charAt(0).toUpperCase() || 'U';
  }

  onRefresh(): void {
    // Placeholder for feature dashboards that load remote data
  }
}
