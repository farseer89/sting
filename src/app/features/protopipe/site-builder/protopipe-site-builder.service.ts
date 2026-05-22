import { Injectable, inject, signal } from '@angular/core';
import type {
  SiteBuilderComponentEntry,
  SiteTemplateSummary,
  SitePageDraft,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../protopipe-http.util';
import { ProtopipeApiService } from '../protopipe-api.service';

@Injectable({ providedIn: 'root' })
export class ProtopipeSiteBuilderService {
  private readonly api = inject(ProtopipeApiService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _components = signal<SiteBuilderComponentEntry[]>([]);
  private readonly _stats = signal({ total: 0, interactive: 0, adminTabled: 0 });
  private readonly _loaded = signal(false);

  private readonly _templatesLoading = signal(false);
  private readonly _templatesError = signal<string | null>(null);
  private readonly _templates = signal<SiteTemplateSummary[]>([]);
  private readonly _templatesLoaded = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly components = this._components.asReadonly();
  readonly stats = this._stats.asReadonly();

  readonly templatesLoading = this._templatesLoading.asReadonly();
  readonly templatesError = this._templatesError.asReadonly();
  readonly templates = this._templates.asReadonly();

  async ensureLoaded(): Promise<void> {
    if (this._loaded()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getSiteBuilderComponents();
      this._components.set(res.components);
      this._stats.set(res.stats);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load component library.'));
    } finally {
      this._loading.set(false);
    }
  }

  getComponentById(id: string): SiteBuilderComponentEntry | undefined {
    return this._components().find((c) => c.id === id);
  }

  async ensureTemplatesLoaded(): Promise<void> {
    if (this._templatesLoaded()) return;
    this._templatesLoading.set(true);
    this._templatesError.set(null);
    try {
      const res = await this.api.getSiteBuilderTemplates();
      this._templates.set(res.templates);
      this._templatesLoaded.set(true);
    } catch (err) {
      this._templatesError.set(parseProtopipeApiError(err, 'Could not load templates.'));
    } finally {
      this._templatesLoading.set(false);
    }
  }

  getTemplateById(id: string): SiteTemplateSummary | undefined {
    return this._templates().find((t) => t.id === id);
  }

  async createSiteFromTemplate(input: {
    templateId: string;
    displayName: string;
    slug?: string;
    theme?: string;
    basics: Record<string, string>;
  }): Promise<{ siteId: string; pageDraft: SitePageDraft }> {
    const res = await this.api.createSite(input);
    return { siteId: res.site.id, pageDraft: res.pageDraft };
  }
}
