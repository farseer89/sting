import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { MagicLinkVerifyResponse, ProtopipeClientUser } from '@hive/contracts';
import { environment } from '@env/environment';

const STORAGE_KEY = 'client_portal_access_token';

@Injectable({ providedIn: 'root' })
export class ClientAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<ProtopipeClientUser | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  getToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this._user.set(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async verifyMagicLink(token: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.post<MagicLinkVerifyResponse>(
          `${environment.MICRO_BASE_URL}/api/v2/public/magic-link/verify`,
          { token },
        ),
      );
      this.setToken(res.accessToken);
      this._user.set(res.clientUser);
      return true;
    } catch {
      this.clearSession();
      this._error.set('This link has expired or is invalid — request a new one from your provider.');
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  async loadMe(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    this._loading.set(true);
    this._error.set(null);
    try {
      const me = await firstValueFrom(
        this.http.get<ProtopipeClientUser>(`${environment.MICRO_BASE_URL}/api/v2/client/me`),
      );
      this._user.set(me);
      return true;
    } catch {
      this.clearSession();
      this._error.set('Your session has ended. Please use the link from your email again.');
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  signOut(): void {
    this.clearSession();
    void this.router.navigate(['/portal/welcome']);
  }
}
