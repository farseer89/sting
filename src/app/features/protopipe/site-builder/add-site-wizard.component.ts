import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import type { SiteTemplateSummary, SiteTemplateWizardField } from '@hive/contracts';
import { ProtopipeSiteBuilderService } from './protopipe-site-builder.service';
import { ProtopipeApiService } from '../protopipe-api.service';
import { parseProtopipeApiError } from '../protopipe-http.util';

const THEME_OPTIONS = [
  { label: 'Ocean', value: 'ocean' },
  { label: 'Classic gold', value: 'classic-gold' },
  { label: 'Slate rose', value: 'slate-rose' },
  { label: 'Ink cream', value: 'ink-cream' },
];

@Component({
  selector: 'app-add-site-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Button, InputText, Textarea, Select],
  template: `
    <div class="wizard-page">
      <a routerLink="/protopipe/site-builder/templates">← Templates</a>
      <h1>Add site</h1>

      @if (loading()) {
        <p>Loading template…</p>
      } @else if (error(); as err) {
        <p class="error">{{ err }}</p>
      } @else if (template(); as t) {
        <p class="template-pick">Template: <strong>{{ t.label }}</strong></p>

        <label class="field">
          <span>Display name</span>
          <input pInputText [(ngModel)]="displayName" (ngModelChange)="onNameChange()" />
        </label>

        <label class="field">
          <span>Site slug (repo folder)</span>
          <input pInputText [(ngModel)]="slug" />
          <small>Used for files in client-sites only. Live URL appears after Publish.</small>
        </label>

        <label class="field">
          <span>Theme</span>
          <p-select
            [options]="themeOptions"
            [(ngModel)]="theme"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </label>

        @for (f of t.requiredFields; track f.key) {
          <label class="field">
            <span>{{ f.label }}{{ f.required ? ' *' : '' }}</span>
            @if (f.type === 'textarea') {
              <textarea pTextarea [(ngModel)]="basics[f.key]" rows="3" class="w-full"></textarea>
            } @else {
              <input
                pInputText
                [type]="f.type === 'email' ? 'email' : 'text'"
                [(ngModel)]="basics[f.key]"
                [placeholder]="f.placeholder ?? ''"
                class="w-full"
              />
            }
          </label>
        }

        @if (submitError(); as se) {
          <p class="error">{{ se }}</p>
        }

        <div class="actions">
          <p-button
            label="Create & edit page"
            icon="pi pi-check"
            [loading]="submitting()"
            (onClick)="submit()"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .wizard-page {
      max-width: 32rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
    }
    .field small {
      color: var(--text-color-secondary);
    }
    .actions {
      margin-top: 1.5rem;
    }
    .error {
      color: var(--red-500);
    }
    .template-pick {
      margin-bottom: 1.25rem;
    }
  `,
})
export class AddSiteWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sb = inject(ProtopipeSiteBuilderService);
  private readonly api = inject(ProtopipeApiService);

  protected readonly themeOptions = THEME_OPTIONS;
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly template = signal<SiteTemplateSummary | null>(null);

  protected displayName = '';
  protected slug = '';
  protected theme = 'ocean';
  protected basics: Record<string, string> = {};

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.sb.ensureTemplatesLoaded();
    const templateId =
      this.route.snapshot.queryParamMap.get('templateId') ??
      this.sb.templates()[0]?.id;
    if (!templateId) {
      this.error.set('No templates available.');
      this.loading.set(false);
      return;
    }
    try {
      const res = await this.api.getSiteBuilderTemplate(templateId);
      const t = res.template as SiteTemplateSummary;
      this.template.set(t);
      this.theme = t.themeDefault;
      for (const f of t.requiredFields) {
        this.basics[f.key] = '';
      }
    } catch (err) {
      this.error.set(parseProtopipeApiError(err, 'Could not load template.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected onNameChange(): void {
    if (!this.slug || this.slug === this.slugify(this.displayName)) {
      this.slug = this.slugify(this.displayName);
    }
    if (this.template()?.requiredFields.some((f) => f.key === 'businessName')) {
      this.basics['businessName'] = this.displayName;
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  protected async submit(): Promise<void> {
    const t = this.template();
    if (!t || !this.displayName.trim()) return;

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      const basics = { ...this.basics, businessName: this.basics['businessName'] || this.displayName };
      const { siteId } = await this.sb.createSiteFromTemplate({
        templateId: t.id,
        displayName: this.displayName.trim(),
        slug: this.slug.trim() || undefined,
        theme: this.theme,
        basics,
      });
      await this.router.navigate(['/protopipe/site-builder/sites', siteId, 'edit']);
    } catch (err) {
      this.submitError.set(parseProtopipeApiError(err, 'Could not create site.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
