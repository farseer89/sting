import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ClientAuthService } from '../client-auth.service';

@Component({
  selector: 'app-client-portal-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Button, ProgressSpinner],
  templateUrl: './client-portal-dashboard.component.html',
  styleUrl: './client-portal-dashboard.component.scss',
})
export class ClientPortalDashboardComponent implements OnInit {
  protected readonly auth = inject(ClientAuthService);

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && !this.auth.user()) {
      void this.auth.loadMe();
    }
  }

  displayName(): string {
    const name = this.auth.user()?.name?.trim();
    return name ? `, ${name}` : '';
  }

  signOut(): void {
    this.auth.signOut();
  }
}
