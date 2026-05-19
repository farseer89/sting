import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUserInfo {
  firstName: string;
  lastName: string;
  userId: string;
  userPhoto?: string;
  userAccountType?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly microLoginUrl = environment.MICRO_USER_SIGNIN;

  currentUserEmail = '';
  currentUserFirstName = '';
  currentUserLastName = '';
  currentUserPhoto = '';
  currentUserId = '';

  private readonly authStateSubject = new BehaviorSubject<boolean>(false);
  readonly authState$ = this.authStateSubject.asObservable();

  private readonly sessionExpiredSubject = new BehaviorSubject<boolean>(false);
  readonly sessionExpired$ = this.sessionExpiredSubject.asObservable();

  constructor() {
    if (this.isLoggedIn()) {
      this.loadFromStorage();
      this.authStateSubject.next(true);
    }
  }

  loginUser(email: string, password: string, rememberMe: boolean): Promise<AuthUserInfo> {
    return new Promise((resolve, reject) => {
      this.http
        .post(this.microLoginUrl, { email, password }, { withCredentials: true })
        .subscribe({
          next: (data: unknown) => {
            this.persistUser(data, rememberMe);
            this.authStateSubject.next(true);
            resolve(this.buildUserInfo(data));
          },
          error: (err) => {
            const message =
              err?.error?.errors?.[0]?.message ||
              err?.error?.message ||
              err?.message ||
              'Login failed';
            reject(new Error(message));
          },
        });
    });
  }

  logout(): void {
    this.clearTokens();
    this.currentUserId = '';
    this.currentUserEmail = '';
    this.currentUserFirstName = '';
    this.currentUserLastName = '';
    this.currentUserPhoto = '';
    localStorage.removeItem('currentUserData');
    sessionStorage.removeItem('currentUserData');
    this.authStateSubject.next(false);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('currentUserData') || !!sessionStorage.getItem('currentUserData');
  }

  getToken(): string | null {
    const raw = localStorage.getItem('currentUserData') || sessionStorage.getItem('currentUserData');
    if (!raw) return null;
    try {
      return JSON.parse(raw).tokens?.accessToken ?? null;
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    const raw = localStorage.getItem('currentUserData') || sessionStorage.getItem('currentUserData');
    if (!raw) return null;
    try {
      return JSON.parse(raw).tokens?.refreshToken ?? null;
    } catch {
      return null;
    }
  }

  setTokens(accessToken: string, refreshToken: string, rememberMe = true): void {
    const raw = localStorage.getItem('currentUserData') || sessionStorage.getItem('currentUserData');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.tokens = { accessToken, refreshToken };
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem('currentUserData', JSON.stringify(parsed));
  }

  refreshToken(): Observable<{ tokens?: { accessToken: string; refreshToken: string } }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post(`${environment.MICRO_BASE_URL}/api/users/refresh`, { refreshToken })
      .pipe(
        tap((response: { tokens?: { accessToken: string; refreshToken: string } }) => {
          if (response?.tokens) {
            this.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
          }
        }),
        catchError((err) => {
          this.emitSessionExpired();
          return throwError(() => err);
        })
      );
  }

  emitSessionExpired(): void {
    this.sessionExpiredSubject.next(true);
  }

  dismissSessionExpired(): void {
    this.sessionExpiredSubject.next(false);
  }

  getCurrentUserId(): string {
    return this.currentUserId || localStorage.getItem('userId') || sessionStorage.getItem('userId') || '';
  }

  getCurrentUserFullName(): string {
    return `${this.currentUserFirstName} ${this.currentUserLastName}`.trim() || 'User';
  }

  getCurrentUserPhoto(): string {
    return this.currentUserPhoto || 'assets/avatar-placeholder.png';
  }

  private persistUser(data: unknown, rememberMe: boolean): void {
    const user = data as Record<string, string>;
    this.currentUserEmail = user['email'] ?? '';
    this.currentUserFirstName = user['firstName'] ?? '';
    this.currentUserLastName = user['lastName'] ?? '';
    this.currentUserPhoto = user['userPhoto'] ?? '';
    this.currentUserId = user['id'] ?? '';
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem('currentUserData', JSON.stringify(data));
    store.setItem('userId', this.currentUserId);
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem('currentUserData') || sessionStorage.getItem('currentUserData');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this.currentUserEmail = data.email ?? '';
      this.currentUserFirstName = data.firstName ?? '';
      this.currentUserLastName = data.lastName ?? '';
      this.currentUserPhoto = data.userPhoto ?? '';
      this.currentUserId = data.id ?? '';
    } catch {
      /* ignore */
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('currentUserData');
    sessionStorage.removeItem('currentUserData');
  }

  private buildUserInfo(data: unknown): AuthUserInfo {
    const u = data as Record<string, string>;
    return {
      firstName: u['firstName'] ?? '',
      lastName: u['lastName'] ?? '',
      userId: u['id'] ?? '',
      userPhoto: u['userPhoto'],
      userAccountType: u['userAccountType'],
    };
  }
}
