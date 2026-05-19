import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import type {
  RefreshResponse,
  SignInRequest,
  SignInResponse,
  StoredUserSession,
  UserPublic,
} from '@hive/contracts';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '@env/environment';

/** UI-facing subset derived from {@link UserPublic}. */
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
    const body: SignInRequest = { email, password };
    return new Promise((resolve, reject) => {
      this.http.post<SignInResponse>(this.microLoginUrl, body, { withCredentials: true }).subscribe({
        next: (data) => {
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
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    this.authStateSubject.next(false);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('currentUserData') || !!sessionStorage.getItem('currentUserData');
  }

  getSession(): StoredUserSession | null {
    const raw = localStorage.getItem('currentUserData') || sessionStorage.getItem('currentUserData');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUserSession;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.getSession()?.tokens?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.getSession()?.tokens?.refreshToken ?? null;
  }

  setTokens(accessToken: string, refreshToken: string, rememberMe = true): void {
    const session = this.getSession();
    if (!session) return;
    const updated: StoredUserSession = {
      ...session,
      tokens: { accessToken, refreshToken },
    };
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem('currentUserData', JSON.stringify(updated));
  }

  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<RefreshResponse>(`${environment.MICRO_BASE_URL}/api/users/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          if (response?.tokens) {
            const rememberMe = !!localStorage.getItem('currentUserData');
            this.setTokens(response.tokens.accessToken, response.tokens.refreshToken, rememberMe);
          }
        }),
        catchError((err) => {
          this.emitSessionExpired();
          return throwError(() => err);
        }),
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
    return this.currentUserPhoto || 'assets/images/blocks/avatars/circle/avatar-f-1.png';
  }

  private persistUser(data: SignInResponse, rememberMe: boolean): void {
    this.applyUserFields(data);
    const session: StoredUserSession = data;
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem('currentUserData', JSON.stringify(session));
    store.setItem('userId', this.currentUserId);
  }

  private loadFromStorage(): void {
    const session = this.getSession();
    if (!session) return;
    this.applyUserFields(session);
  }

  private applyUserFields(user: UserPublic): void {
    this.currentUserEmail = user.email ?? '';
    this.currentUserFirstName = user.firstName ?? '';
    this.currentUserLastName = user.lastName ?? '';
    this.currentUserPhoto = user.userPhoto ?? '';
    this.currentUserId = user.id ?? '';
  }

  private clearTokens(): void {
    localStorage.removeItem('currentUserData');
    sessionStorage.removeItem('currentUserData');
  }

  private buildUserInfo(data: UserPublic): AuthUserInfo {
    return {
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      userId: data.id ?? '',
      userPhoto: data.userPhoto,
      userAccountType: data.userAccountType,
    };
  }
}
