import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import type {
  RefreshResponseV2,
  SignInRequest,
  SignInResponseV2,
  StoredUserProfile,
  UserPublic,
} from '@hive/contracts';
import { AuthV2Endpoints, ShireEndpoints } from '@hive/contracts';
import { BehaviorSubject, Observable, firstValueFrom, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { isAccessTokenValid } from './jwt.util';
import { isShirePrimary, shireApiUrl } from '../../features/protopipe/shire/shire-http.util';

/** UI-facing subset derived from {@link UserPublic}. */
export interface AuthUserInfo {
  firstName: string;
  lastName: string;
  userId: string;
  userPhoto?: string;
  userAccountType?: string;
}

interface ShireAuthResponse {
  accessToken: string;
  user: { id: string; email: string; accountId: string };
}

const PROFILE_STORAGE_KEY = 'stingUserProfile';
const SHIRE_CSRF_HEADER = 'x-shire-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly signInUrl = isShirePrimary()
    ? shireApiUrl(ShireEndpoints.auth.login)
    : environment.MICRO_USER_SIGNIN;
  private readonly refreshUrl = isShirePrimary()
    ? shireApiUrl(ShireEndpoints.auth.refresh)
    : `${environment.MICRO_BASE_URL}${AuthV2Endpoints.refresh.path}`;
  private readonly logoutUrl = isShirePrimary()
    ? shireApiUrl(ShireEndpoints.auth.logout)
    : `${environment.MICRO_BASE_URL}${AuthV2Endpoints.logout.path}`;

  /** Short-lived access JWT — memory only, never persisted. */
  private accessToken: string | null = null;
  private sessionBootstrapped = false;

  currentUserEmail = '';
  currentUserFirstName = '';
  currentUserLastName = '';
  currentUserPhoto = '';
  currentUserId = '';

  private readonly authStateSubject = new BehaviorSubject<boolean>(false);
  readonly authState$ = this.authStateSubject.asObservable();

  private readonly sessionExpiredSubject = new BehaviorSubject<boolean>(false);
  readonly sessionExpired$ = this.sessionExpiredSubject.asObservable();

  private readonly refreshingSubject = new BehaviorSubject<boolean>(false);
  readonly refreshing$ = this.refreshingSubject.asObservable();

  constructor() {
    if (this.hasStoredProfile()) {
      this.loadProfileFromStorage();
    }
  }

  loginUser(email: string, password: string, rememberMe: boolean): Promise<AuthUserInfo> {
    const body: SignInRequest = { email, password };
    return new Promise((resolve, reject) => {
      this.http
        .post<SignInResponseV2 | ShireAuthResponse>(this.signInUrl, body, { withCredentials: true })
        .subscribe({
          next: (data) => {
            this.applySession(this.normalizeAuthResponse(data), rememberMe);
            this.authStateSubject.next(true);
            resolve(this.buildUserInfo(this.normalizeAuthResponse(data)));
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
    const options = isShirePrimary()
      ? { withCredentials: true, headers: new HttpHeaders({ [SHIRE_CSRF_HEADER]: '1' }) }
      : { withCredentials: true };
    this.http.post(this.logoutUrl, {}, options).subscribe({
      error: () => {
        /* clear local state even if network fails */
      },
    });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  hasStoredProfile(): boolean {
    return !!this.readProfileRaw('local') || !!this.readProfileRaw('session');
  }

  isLoggedIn(): boolean {
    return this.hasValidAccessToken() || this.hasStoredProfile();
  }

  hasValidAccessToken(): boolean {
    return isAccessTokenValid(this.accessToken);
  }

  getToken(): string | null {
    return this.hasValidAccessToken() ? this.accessToken : null;
  }

  /** Dev-only: drop in-memory access JWT to exercise refresh / expired dialog flows. */
  clearAccessToken(): void {
    this.accessToken = null;
  }

  getStoredProfile(): StoredUserProfile | null {
    const raw = this.readProfileRaw('local') || this.readProfileRaw('session');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUserProfile;
    } catch {
      return null;
    }
  }

  bootstrapSession(): Promise<boolean> {
    if (this.sessionBootstrapped) {
      return Promise.resolve(this.hasValidAccessToken());
    }
    this.sessionBootstrapped = true;

    if (!this.hasStoredProfile()) {
      return Promise.resolve(false);
    }
    this.loadProfileFromStorage();
    if (this.hasValidAccessToken()) {
      this.authStateSubject.next(true);
      return Promise.resolve(true);
    }
    this.refreshingSubject.next(true);
    return firstValueFrom(
      this.refreshAccessToken({ silent: true }).pipe(
        tap(() => this.authStateSubject.next(true)),
        catchError(() => {
          this.accessToken = null;
          this.authStateSubject.next(false);
          return throwError(() => new Error('Session expired'));
        }),
      ),
    )
      .then(() => true)
      .catch(() => false)
      .finally(() => this.refreshingSubject.next(false));
  }

  refreshAccessToken(options?: { silent?: boolean }): Observable<RefreshResponseV2> {
    if (!options?.silent) {
      this.refreshingSubject.next(true);
    }
    const httpOptions = isShirePrimary()
      ? {
          withCredentials: true,
          headers: new HttpHeaders({ [SHIRE_CSRF_HEADER]: '1' }),
        }
      : { withCredentials: true };

    return this.http.post<RefreshResponseV2>(this.refreshUrl, {}, httpOptions).pipe(
      tap((response) => {
        if (response?.accessToken) {
          this.accessToken = response.accessToken;
        }
        this.refreshingSubject.next(false);
      }),
      catchError((err) => {
        this.refreshingSubject.next(false);
        if (!options?.silent) {
          const code = err?.error?.code;
          if (code === 'SESSION_REVOKED') {
            this.emitSessionRevoked();
          } else {
            this.emitSessionExpired();
          }
        }
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

  private readonly sessionRevokedSubject = new BehaviorSubject<boolean>(false);
  readonly sessionRevoked$ = this.sessionRevokedSubject.asObservable();

  emitSessionRevoked(): void {
    this.sessionRevokedSubject.next(true);
  }

  dismissSessionRevoked(): void {
    this.sessionRevokedSubject.next(false);
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

  private normalizeAuthResponse(data: SignInResponseV2 | ShireAuthResponse): SignInResponseV2 {
    if ('user' in data && data.user && !('firstName' in data)) {
      const shire = data as ShireAuthResponse;
      return {
        id: shire.user.id,
        email: shire.user.email,
        accessToken: shire.accessToken,
        authProvider: 'email',
        firstName: '',
        lastName: '',
        userPhoto: '',
      };
    }
    return data as SignInResponseV2;
  }

  private applySession(data: SignInResponseV2, rememberMe: boolean): void {
    const { accessToken, authProvider, ...user } = data;
    this.accessToken = accessToken;
    this.applyUserFields(user);
    const profile: StoredUserProfile = { ...user, authProvider: authProvider ?? 'email' };
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    store.setItem('userId', this.currentUserId);
    this.migrateLegacySession(rememberMe);
  }

  private loadProfileFromStorage(): void {
    const profile = this.getStoredProfile();
    if (!profile) return;
    this.applyUserFields(profile);
  }

  private applyUserFields(user: UserPublic): void {
    this.currentUserEmail = user.email ?? '';
    this.currentUserFirstName = user.firstName ?? '';
    this.currentUserLastName = user.lastName ?? '';
    this.currentUserPhoto = user.userPhoto ?? '';
    this.currentUserId = user.id ?? '';
  }

  private clearSession(): void {
    this.accessToken = null;
    this.currentUserId = '';
    this.currentUserEmail = '';
    this.currentUserFirstName = '';
    this.currentUserLastName = '';
    this.currentUserPhoto = '';
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    sessionStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem('currentUserData');
    sessionStorage.removeItem('currentUserData');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    this.authStateSubject.next(false);
    this.refreshingSubject.next(false);
  }

  private migrateLegacySession(rememberMe: boolean): void {
    const legacyStore = rememberMe ? localStorage : sessionStorage;
    legacyStore.removeItem('currentUserData');
  }

  private readProfileRaw(store: 'local' | 'session'): string | null {
    const storage = store === 'local' ? localStorage : sessionStorage;
    return storage.getItem(PROFILE_STORAGE_KEY);
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
