import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Message } from 'primeng/message';
import { ProtopipeAdminAgentService } from '../protopipe-admin-agent.service';
import { ProtopipeApiService } from '../protopipe-api.service';

@Component({
  selector: 'app-protopipe-agent-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Textarea, Select, ProgressSpinner, Message],
  templateUrl: './protopipe-agent-control.component.html',
  styleUrl: './protopipe-agent-control.component.scss',
})
export class ProtopipeAgentControlComponent implements OnInit {
  protected readonly admin = inject(ProtopipeAdminAgentService);
  private readonly api = inject(ProtopipeApiService);

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
    const { authorizationUrl } = await this.api.googleOAuthStart();
    window.open(authorizationUrl, '_blank', 'noopener');
  }

  async onSiteChange(siteId: string): Promise<void> {
    if (siteId) await this.admin.selectSite(siteId);
  }
}
