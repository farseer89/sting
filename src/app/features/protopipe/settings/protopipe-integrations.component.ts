import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import type {
  ProtopipeAccountGoogleStatusResponse,
  ProtopipeSiteConnection,
  ProtopipeSpyFuStatusResponse,
} from '@hive/contracts';
import { ProtopipeApiService } from '../protopipe-api.service';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

type ViewState = 'loading' | 'not-configured' | 'not-connected' | 'connected' | 'error';
type SpyFuViewState = ViewState;

@Component({
  selector: 'app-protopipe-integrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Button, InputText, Password, ProgressSpinner, Tag, Toast],
  providers: [MessageService],
  templateUrl: './protopipe-integrations.component.html',
  styleUrl: './protopipe-integrations.component.scss',
})
export class ProtopipeIntegrationsComponent implements OnInit {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);

  readonly loading = signal<boolean>(true);
  readonly busy = signal<boolean>(false);
  readonly status = signal<ProtopipeAccountGoogleStatusResponse | null>(null);
  readonly loadError = signal<string | null>(null);

  readonly spyFuLoading = signal<boolean>(true);
  readonly spyFuStatus = signal<ProtopipeSpyFuStatusResponse | null>(null);
  readonly spyFuLoadError = signal<string | null>(null);

  readonly wpLoading = signal(false);
  readonly wpBusy = signal(false);
  readonly wpConnections = signal<ProtopipeSiteConnection[]>([]);
  readonly wpSiteUrl = signal('');
  readonly wpUsername = signal('');
  readonly wpAppPassword = signal('');
  readonly wpLabel = signal('WordPress');

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
    await this.strategy.ensureLoaded();
    await Promise.all([this.refresh(), this.refreshSpyFu(), this.refreshWordPress()]);

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

  async refreshWordPress(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this.wpLoading.set(true);
    try {
      const { connections } = await this.api.listSiteConnections(siteId);
      const wp = connections.filter((c) => c.provider === 'wordpress');
      this.wpConnections.set(wp);
      const existing = wp[0];
      if (existing) {
        this.wpLabel.set(existing.label);
        this.wpSiteUrl.set(existing.metadata['siteUrl'] ?? '');
      }
    } catch {
      this.wpConnections.set([]);
    } finally {
      this.wpLoading.set(false);
    }
  }

  async saveWordPress(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    if (!this.wpSiteUrl().trim() || !this.wpUsername().trim() || !this.wpAppPassword().trim()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Site URL, username, and application password are required.',
        life: 5000,
      });
      return;
    }
    this.wpBusy.set(true);
    try {
      await this.api.upsertWordPressConnection(siteId, {
        label: this.wpLabel().trim() || 'WordPress',
        siteUrl: this.wpSiteUrl().trim(),
        username: this.wpUsername().trim(),
        applicationPassword: this.wpAppPassword().trim(),
      });
      this.wpAppPassword.set('');
      this.messages.add({
        severity: 'success',
        summary: 'WordPress connected',
        detail: 'You can publish articles to WordPress from the writer.',
        life: 5000,
      });
      await this.refreshWordPress();
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Connection failed',
        detail: parseProtopipeApiError(err, 'Could not save WordPress connection.'),
        life: 6000,
      });
    } finally {
      this.wpBusy.set(false);
    }
  }

  async disconnectWordPress(connectionId: string): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    if (!window.confirm('Disconnect WordPress for this site?')) return;
    this.wpBusy.set(true);
    try {
      await this.api.deleteSiteConnection(siteId, connectionId);
      this.messages.add({ severity: 'success', summary: 'WordPress disconnected', life: 4000 });
      await this.refreshWordPress();
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: 'Disconnect failed',
        detail: parseProtopipeApiError(err, 'Please try again.'),
        life: 6000,
      });
    } finally {
      this.wpBusy.set(false);
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
