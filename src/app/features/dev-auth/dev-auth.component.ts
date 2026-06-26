import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { decodeJwtExp } from '../../core/auth/jwt.util';
import { isShirePrimary } from '../protopipe/shire/shire-http.util';

@Component({
  selector: 'app-dev-auth',
  standalone: true,
  imports: [AsyncPipe, DatePipe, Button, Tag],
  template: `
    <div class="p-4 max-w-2xl mx-auto">
      <h1 class="text-2xl font-semibold mb-2">Auth debug</h1>
      <p class="text-600 mb-4">
        Shire-primary: {{ shirePrimary ? 'yes' : 'no' }}. Pair with Shire
        <code>JWT_EXPIRES_IN=1m</code> for fast refresh QA.
      </p>

      <div class="flex flex-column gap-3">
        <div>
          <strong>Stored profile:</strong>
          {{ auth.hasStoredProfile() ? 'yes' : 'no' }}
        </div>
        <div>
          <strong>Valid access token:</strong>
          {{ auth.hasValidAccessToken() ? 'yes' : 'no' }}
        </div>
        <div>
          <strong>Refreshing:</strong>
          {{ (auth.refreshing$ | async) ? 'yes' : 'no' }}
        </div>
        <div>
          <strong>Access token exp:</strong>
          @if (tokenExpMs(); as exp) {
            {{ exp | date: 'medium' }} ({{ secondsUntilExp() }}s)
          } @else {
            —
          }
        </div>
        <div class="flex gap-2 flex-wrap">
          <button pButton type="button" label="Force refresh" (click)="forceRefresh()"></button>
          <button
            pButton
            type="button"
            severity="secondary"
            label="Clear access token"
            (click)="clearAccessToken()"
          ></button>
          <button pButton type="button" severity="danger" label="Logout" (click)="logout()"></button>
        </div>
        @if (lastAction()) {
          <p-tag [value]="lastAction()!" />
        }
      </div>
    </div>
  `,
})
export class DevAuthComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly shirePrimary = isShirePrimary();
  readonly tokenExpMs = signal<number | null>(null);
  readonly secondsUntilExp = signal<number | null>(null);
  readonly lastAction = signal<string | null>(null);
  private tick?: ReturnType<typeof setInterval>;
  private refreshingSub?: Subscription;

  ngOnInit(): void {
    this.updateTokenExp();
    this.tick = setInterval(() => this.updateTokenExp(), 1000);
    this.refreshingSub = this.auth.refreshing$.subscribe(() => this.updateTokenExp());
  }

  ngOnDestroy(): void {
    if (this.tick) clearInterval(this.tick);
    this.refreshingSub?.unsubscribe();
  }

  async forceRefresh(): Promise<void> {
    try {
      await firstValueFrom(this.auth.refreshAccessToken({ silent: false }));
      this.lastAction.set('Refresh succeeded');
    } catch {
      this.lastAction.set('Refresh failed');
    }
    this.updateTokenExp();
  }

  clearAccessToken(): void {
    this.auth.clearAccessToken();
    this.lastAction.set('Access token cleared (simulate expiry)');
    this.updateTokenExp();
  }

  logout(): void {
    this.auth.logout();
    this.lastAction.set('Logged out');
  }

  private updateTokenExp(): void {
    const raw = this.auth.getToken();
    const expSec = raw ? decodeJwtExp(raw) : null;
    const expMs = expSec != null ? expSec * 1000 : null;
    this.tokenExpMs.set(expMs);
    this.secondsUntilExp.set(expMs ? Math.max(0, Math.round((expMs - Date.now()) / 1000)) : null);
  }
}
