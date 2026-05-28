import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type {
  ProtopipeAccountGoogleStatusResponse,
  ProtopipeSpyFuStatusResponse,
} from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

type ViewState = 'loading' | 'not-configured' | 'not-connected' | 'connected' | 'error';
type SpyFuViewState = ViewState;

@Component({
  selector: 'app-protopipe-integrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, ProgressSpinner, Tag, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-integrations.component.html',
  styleUrl: './protopipe-integrations.component.scss',
})
export class ProtopipeIntegrationsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);

  readonly loading = signal<boolean>(true);
  readonly busy = signal<boolean>(false);
  readonly status = signal<ProtopipeAccountGoogleStatusResponse | null>(null);
  readonly loadError = signal<string | null>(null);

  readonly spyFuLoading = signal<boolean>(true);
  readonly spyFuStatus = signal<ProtopipeSpyFuStatusResponse | null>(null);
  readonly spyFuLoadError = signal<string | null>(null);

  readonly viewState = computed<ViewState>(() => {
    if (this.loading()) return 'loading';
    if (this.loadError()) return 'error';
    const s = this.status();
    if (!s) return 'error';
    if (!s.configured) return 'not-configured';
    if (!s.connected) return 'not-connected';
    return 'connected';
  });

  readonly connectedAtDisplay = computed(() => {
    const at = this.status()?.connectedAt;
    if (!at) return null;
    try {
      return new Date(at).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return at;
    }
  });

  readonly spyFuViewState = computed<SpyFuViewState>(() => {
    if (this.spyFuLoading()) return 'loading';
    if (this.spyFuLoadError()) return 'error';
    const s = this.spyFuStatus();
    if (!s) return 'error';
    if (!s.configured) return 'not-configured';
    if (!s.connected) return 'not-connected';
    return 'connected';
  });

  readonly scopeChips = computed<string[]>(() => {
    const scopes = this.status()?.scopes ?? [];
    return scopes.map((scope) => {
      if (scope.includes('webmasters')) return 'Search Console';
      if (scope.includes('analytics')) return 'Analytics';
      if (scope === 'openid' || scope === 'email' || scope.endsWith('/userinfo.email')) {
        return 'Email';
      }
      return scope.replace(/^.*\//, '');
    });
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.refresh(), this.refreshSpyFu()]);

    const qp = this.route.snapshot.queryParamMap;
    const flag = qp.get('googleConnected');
    if (flag === 'ok') {
      this.messages.add({
        severity: 'success',
        summary: 'Google connected',
        detail: 'Search Console + Analytics are now available for this account.',
        life: 5000,
      });
    } else if (flag === 'error') {
      const reason = qp.get('reason');
      this.messages.add({
        severity: 'error',
        summary: 'Connection failed',
        detail: reason || 'Please try again.',
        life: 8000,
      });
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.api.getAccountGoogleStatus();
      this.status.set(result);
    } catch (err) {
      this.loadError.set(parseProtopipeApiError(err, 'Could not load integration status.'));
    } finally {
      this.loading.set(false);
    }
  }

  async refreshSpyFu(): Promise<void> {
    this.spyFuLoading.set(true);
    this.spyFuLoadError.set(null);
    try {
      const result = await this.api.spyFuStatus();
      this.spyFuStatus.set(result);
    } catch (err) {
      this.spyFuLoadError.set(parseProtopipeApiError(err, 'Could not load SpyFu status.'));
    } finally {
      this.spyFuLoading.set(false);
    }
  }

  async connect(): Promise<void> {
    this.busy.set(true);
    try {
      const returnTo = window.location.origin + window.location.pathname;
      const result = await this.api.startAccountGoogleOAuth(returnTo);
      window.location.href = result.authUrl;
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not start Google sign-in',
        detail: parseProtopipeApiError(err, 'Please try again.'),
        life: 6000,
      });
      this.busy.set(false);
    }
  }

  async disconnect(): Promise<void> {
    if (this.busy()) return;
    const confirmed = window.confirm(
      'Disconnect Google? Search Console + Analytics data will stop loading until you reconnect.',
    );
    if (!confirmed) return;
    this.busy.set(true);
    try {
      await this.api.disconnectAccountGoogle();
      this.messages.add({
        severity: 'success',
        summary: 'Google disconnected',
        life: 4000,
      });
      await this.refresh();
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Disconnect failed',
        detail: parseProtopipeApiError(err, 'Please try again.'),
        life: 6000,
      });
    } finally {
      this.busy.set(false);
    }
  }
}
