import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ClientAuthService } from '../client-auth.service';

@Component({
  selector: 'app-client-portal-welcome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressSpinner],
  templateUrl: './client-portal-welcome.component.html',
  styleUrl: './client-portal-welcome.component.scss',
})
export class ClientPortalWelcomeComponent implements OnInit {
  protected readonly auth = inject(ClientAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(null);

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t);

    if (this.auth.isAuthenticated() && !t) {
      void this.router.navigate(['/portal/dashboard']);
      return;
    }

    if (t) {
      void this.exchangeAndRedirect(t);
    }
  }

  private async exchangeAndRedirect(token: string): Promise<void> {
    const ok = await this.auth.verifyMagicLink(token);
    if (ok) {
      void this.router.navigate(['/portal/dashboard'], { replaceUrl: true });
    }
  }
}
