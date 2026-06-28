import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';
import type {
  ProtopipeGooglePlatformOAuthAdsProbeResponse,
  ProtopipeGooglePlatformOAuthStatusResponse,
} from '@hive/contracts';
import { ProtopipeAdminAgentService } from '../protopipe-admin-agent.service';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { isShirePrimary, protopipeApiBase } from '../shire/shire-http.util';

@Component({
  selector: 'app-protopipe-agent-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Textarea, Select, ProgressSpinner, Message, Tag],
  templateUrl: './protopipe-agent-control.component.html',
  styleUrl: './protopipe-agent-control.component.scss',
})
export class ProtopipeAgentControlComponent implements OnInit {
  protected readonly admin = inject(ProtopipeAdminAgentService);
  private readonly api = inject(ProtopipeApiService);

  readonly shirePrimary = isShirePrimary();
  readonly appOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  readonly googleOAuthHint = signal<string | null>(null);
  readonly googleStatusLoading = signal(false);
  readonly googleStatus = signal<ProtopipeGooglePlatformOAuthStatusResponse | null>(null);
  readonly googleStatusError = signal<string | null>(null);
  readonly googleStatusCheckedAt = signal<string | null>(null);
  readonly googleAdsProbeLoading = signal(false);
  readonly googleAdsProbe = signal<ProtopipeGooglePlatformOAuthAdsProbeResponse | null>(null);
  readonly googleAdsProbeError = signal<string | null>(null);
  readonly googleStatusUrl = this.api.googlePlatformOAuthStatusUrl();
  readonly googleStatusContractPath = this.api.googlePlatformOAuthStatusContractPath();
  readonly googleAdsProbeUrl = this.api.googlePlatformOAuthAdsProbeUrl();
  readonly googleAdsProbeContractPath = this.api.googlePlatformOAuthAdsProbeContractPath();
  readonly protopipeApiBase = protopipeApiBase();

  readonly loading = this.admin.loading;
  readonly saving = this.admin.saving;
  readonly error = this.admin.error;
  readonly global = this.admin.global;
  readonly sites = this.admin.sites;
  readonly selectedSiteId = this.admin.selectedSiteId;
  readonly siteChunks = this.admin.siteChunks;
  readonly globalDirty = this.admin.globalDirty;

  async ngOnInit(): Promise<void> {
    await this.admin.loadControlPanel();
    try {
      const cfg = await this.api.googleOAuthConfig();
      const parts = [
        `Callback URL (add in Google Console): ${cfg.redirectUri}`,
        cfg.oauthClientIdSuffix ? `OAuth client: ${cfg.oauthClientIdSuffix}` : null,
        'publicUrlSource' in cfg && cfg.publicUrlSource ? `Env: ${cfg.publicUrlSource}` : null,
      ].filter(Boolean);
      this.googleOAuthHint.set(parts.join(' · '));
    } catch {
      this.googleOAuthHint.set(null);
    }
    if (this.shirePrimary) {
      await this.checkGooglePlatformStatus();
    }
  }

  rulesText(): string {
    return (this.global()?.rules ?? []).join('\n');
  }

  onRulesChange(text: string): void {
    const rules = text
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    this.admin.setGlobalRules(rules);
  }

  async saveGlobal(): Promise<void> {
    await this.admin.saveGlobal();
  }

  async connectGoogle(): Promise<void> {
    const { authorizationUrl, redirectUri } = await this.api.googleOAuthStart();
    if (redirectUri) {
      this.googleOAuthHint.set(`Callback URL (add in Google Console): ${redirectUri}`);
    }
    window.open(authorizationUrl, '_blank', 'noopener');
  }

  async checkGooglePlatformStatus(): Promise<void> {
    if (!this.shirePrimary) return;
    this.googleStatusLoading.set(true);
    this.googleStatusError.set(null);
    try {
      const status = await this.api.googlePlatformOAuthStatus();
      this.googleStatus.set(status);
      this.googleStatusCheckedAt.set(new Date().toLocaleString());
    } catch (err) {
      this.googleStatus.set(null);
      this.googleStatusError.set(parseProtopipeApiError(err, 'Could not load Google platform status.'));
      this.googleStatusCheckedAt.set(new Date().toLocaleString());
    } finally {
      this.googleStatusLoading.set(false);
    }
  }

  async probeGoogleAds(): Promise<void> {
    if (!this.shirePrimary) return;
    this.googleAdsProbeLoading.set(true);
    this.googleAdsProbeError.set(null);
    try {
      const probe = await this.api.googlePlatformOAuthAdsProbe();
      this.googleAdsProbe.set(probe);
      this.googleStatusCheckedAt.set(new Date(probe.checkedAt).toLocaleString());
    } catch (err) {
      this.googleAdsProbe.set(null);
      this.googleAdsProbeError.set(parseProtopipeApiError(err, 'Could not run Google Ads probe.'));
    } finally {
      this.googleAdsProbeLoading.set(false);
    }
  }

  corsAllowsAppOrigin(probe: ProtopipeGooglePlatformOAuthAdsProbeResponse): string {
    if (!this.appOrigin) return 'unknown';
    return probe.corsAllowedOrigins.includes(this.appOrigin) ? 'yes' : 'no';
  }

  yesNo(value: boolean | null | undefined): string {
    if (value == null) return '—';
    return value ? 'yes' : 'no';
  }

  async onSiteChange(siteId: string): Promise<void> {
    if (siteId) await this.admin.selectSite(siteId);
  }
}
