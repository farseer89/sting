import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ProtopipeMerchBookCatalogProduct,
  ProtopipeMerchBookCatalogMockupStyle,
  ProtopipeMerchBookRunDto,
  ProtopipePrintfulCatalogCategory,
  ProtopipePrintfulCatalogProductDetail,
  ProtopipePrintfulCatalogProductSummary,
  ProtopipeMerchBookStationeryItem,
} from '@hive/contracts';
import { parseProtopipeApiError } from '../../protopipe-http.util';
import { ProtopipeApiService } from '../../protopipe-api.service';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

export type MerchBookSection =
  | 'new'
  | 'browse'
  | 'stationery'
  | 'runs'
  | 'logo'
  | 'products'
  | 'mockups'
  | 'order';

const PRINTFUL_BROWSE_PAGE_SIZE = 24;

const MOCKUP_POLL_MS = 3_000;
const MOCKUP_POLL_MAX_ATTEMPTS = 30;

@Injectable()
export class ProtopipeMerchBookStore {
  private readonly api = inject(ProtopipeApiService);
  private readonly strategy = inject(ProtopipeStrategyService);

  private readonly _loading = signal(false);
  private readonly _catalogLoading = signal(false);
  private readonly _running = signal(false);
  private readonly _mockupsGenerating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _runs = signal<ProtopipeMerchBookRunDto[]>([]);
  private readonly _catalog = signal<ProtopipeMerchBookCatalogProduct[]>([]);
  private readonly _printfulLive = signal(false);
  private readonly _selectedProductIds = signal<string[]>([]);
  private readonly _mockupStyleIds = signal<Record<string, number>>({});
  private readonly _activeRunId = signal<string | null>(null);
  private readonly _section = signal<MerchBookSection>('new');
  private readonly _label = signal('');
  private readonly _logoPrompt = signal('');

  private readonly _printfulBrowseLoading = signal(false);
  private readonly _printfulCategories = signal<ProtopipePrintfulCatalogCategory[]>([]);
  private readonly _printfulProducts = signal<ProtopipePrintfulCatalogProductSummary[]>([]);
  private readonly _printfulPaging = signal({ total: 0, limit: PRINTFUL_BROWSE_PAGE_SIZE, offset: 0 });
  private readonly _printfulCategoryId = signal<number | null>(null);
  private readonly _printfulBrowseLive = signal(false);
  private readonly _printfulProductDetail = signal<ProtopipePrintfulCatalogProductDetail | null>(null);
  private readonly _printfulProductLoading = signal(false);
  private readonly _printfulBrowseLoaded = signal(false);

  private readonly _stationeryLoading = signal(false);
  private readonly _stationeryUploading = signal(false);
  private readonly _stationeryItems = signal<ProtopipeMerchBookStationeryItem[]>([]);
  private readonly _stationerySubcategories = signal<string[]>([]);
  private readonly _stationeryLive = signal(false);
  private readonly _stationerySubcategoryFilter = signal<string>('all');
  private readonly _stationeryArtworkDisplayUrl = signal<string | null>(null);
  private readonly _stationeryArtworkPublicUrl = signal<string | null>(null);
  private readonly _stationeryLoaded = signal(false);
  private readonly _stationeryPreviewOpen = signal(false);
  private readonly _stationeryPreviewItem = signal<ProtopipeMerchBookStationeryItem | null>(null);
  private readonly _stationeryPreviewMockupUrl = signal<string | null>(null);
  private readonly _stationeryPreviewLoading = signal(false);
  private readonly _stationeryPreviewLoadingItemId = signal<string | null>(null);
  private readonly _stationeryPreviewError = signal<string | null>(null);
  private readonly _stationeryPreviewStyleId = signal<number | null>(null);
  private readonly _stationeryPreviewStyleFilter = signal<string>('all');
  private readonly _stationeryMockupCache = signal<Record<string, string>>({});

  readonly loading = this._loading.asReadonly();
  readonly catalogLoading = this._catalogLoading.asReadonly();
  readonly running = this._running.asReadonly();
  readonly mockupsGenerating = this._mockupsGenerating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly catalog = this._catalog.asReadonly();
  readonly printfulLive = this._printfulLive.asReadonly();
  readonly selectedProductIds = this._selectedProductIds.asReadonly();
  readonly activeRunId = this._activeRunId.asReadonly();
  readonly section = this._section.asReadonly();
  readonly label = this._label.asReadonly();
  readonly logoPrompt = this._logoPrompt.asReadonly();

  readonly printfulBrowseLoading = this._printfulBrowseLoading.asReadonly();
  readonly printfulCategories = this._printfulCategories.asReadonly();
  readonly printfulProducts = this._printfulProducts.asReadonly();
  readonly printfulPaging = this._printfulPaging.asReadonly();
  readonly printfulCategoryId = this._printfulCategoryId.asReadonly();
  readonly printfulBrowseLive = this._printfulBrowseLive.asReadonly();
  readonly printfulProductDetail = this._printfulProductDetail.asReadonly();
  readonly printfulProductLoading = this._printfulProductLoading.asReadonly();

  readonly stationeryLoading = this._stationeryLoading.asReadonly();
  readonly stationeryUploading = this._stationeryUploading.asReadonly();
  readonly stationeryItems = this._stationeryItems.asReadonly();
  readonly stationerySubcategories = this._stationerySubcategories.asReadonly();
  readonly stationeryLive = this._stationeryLive.asReadonly();
  readonly stationerySubcategoryFilter = this._stationerySubcategoryFilter.asReadonly();
  readonly stationeryArtworkDisplayUrl = this._stationeryArtworkDisplayUrl.asReadonly();
  readonly stationeryArtworkPublicUrl = this._stationeryArtworkPublicUrl.asReadonly();
  readonly stationeryPreviewOpen = this._stationeryPreviewOpen.asReadonly();
  readonly stationeryPreviewItem = this._stationeryPreviewItem.asReadonly();
  readonly stationeryPreviewMockupUrl = this._stationeryPreviewMockupUrl.asReadonly();
  readonly stationeryPreviewLoading = this._stationeryPreviewLoading.asReadonly();
  readonly stationeryPreviewLoadingItemId = this._stationeryPreviewLoadingItemId.asReadonly();
  readonly stationeryPreviewError = this._stationeryPreviewError.asReadonly();
  readonly stationeryPreviewStyleId = this._stationeryPreviewStyleId.asReadonly();
  readonly stationeryPreviewStyleFilter = this._stationeryPreviewStyleFilter.asReadonly();

  readonly filteredStationeryItems = computed(() => {
    const filter = this._stationerySubcategoryFilter();
    const items = this._stationeryItems();
    if (filter === 'all') return items;
    return items.filter((item) => item.subcategory === filter);
  });

  readonly stationeryCanPreview = computed(
    () => Boolean(this._stationeryArtworkPublicUrl()) && !this._stationeryUploading(),
  );

  readonly filteredStationeryPreviewStyles = computed((): ProtopipeMerchBookCatalogMockupStyle[] => {
    const item = this._stationeryPreviewItem();
    if (!item?.mockupStyles?.length) return [];
    const filter = this._stationeryPreviewStyleFilter();
    if (filter === 'all') return item.mockupStyles;
    return item.mockupStyles.filter((style) => style.category === filter);
  });

  readonly stationeryPreviewStyleCategories = computed((): string[] => {
    const item = this._stationeryPreviewItem();
    if (!item?.mockupStyles?.length) return [];
    return [...new Set(item.mockupStyles.map((style) => style.category))].sort();
  });

  readonly printfulBrowsePage = computed(() => {
    const { offset, limit, total } = this._printfulPaging();
    if (!total) return 1;
    return Math.floor(offset / limit) + 1;
  });

  readonly printfulBrowsePageCount = computed(() => {
    const { total, limit } = this._printfulPaging();
    return total ? Math.ceil(total / limit) : 1;
  });

  readonly sortedPrintfulCategories = computed(() =>
    [...this._printfulCategories()].sort((a, b) => a.title.localeCompare(b.title)),
  );

  readonly selectedProductCount = computed(() => this._selectedProductIds().length);

  readonly canCreateRun = computed(
    () => this._selectedProductIds().length > 0 && !this._running(),
  );

  readonly activeRun = computed(() => {
    const id = this._activeRunId();
    if (!id) return this._runs()[0] ?? null;
    return this._runs().find((r) => r.id === id) ?? null;
  });

  readonly selectedLogo = computed(() =>
    this.activeRun()?.logoConcepts.find((c) => c.status === 'selected') ?? null,
  );

  readonly totalCostUsd = computed(() =>
    this._runs().reduce((sum, r) => sum + (r.costUsd ?? 0), 0),
  );

  setSection(section: MerchBookSection): void {
    this._section.set(section);
    if (section === 'browse' && !this._printfulBrowseLoaded()) {
      void this.loadPrintfulBrowse();
    }
    if (section === 'stationery' && !this._stationeryLoaded()) {
      void this.loadStationery();
    }
  }

  setLabel(value: string): void {
    this._label.set(value);
  }

  setLogoPrompt(value: string): void {
    this._logoPrompt.set(value);
  }

  isProductSelected(productId: string): boolean {
    return this._selectedProductIds().includes(productId);
  }

  toggleProduct(productId: string): void {
    this._selectedProductIds.update((ids) =>
      ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId],
    );
  }

  mockupStyleId(productId: string): number | undefined {
    return this._mockupStyleIds()[productId];
  }

  selectMockupStyle(productId: string, styleId: number): void {
    this._mockupStyleIds.update((map) => ({ ...map, [productId]: styleId }));
    if (!this.isProductSelected(productId)) {
      this._selectedProductIds.update((ids) => [...ids, productId]);
    }
  }

  mockupStyleFilter(productId: string): string {
    return this._mockupStyleFilter()[productId] ?? 'all';
  }

  private readonly _mockupStyleFilter = signal<Record<string, string>>({});

  setMockupStyleFilter(productId: string, category: string): void {
    this._mockupStyleFilter.update((map) => ({ ...map, [productId]: category }));
  }

  filteredMockupStyles(product: ProtopipeMerchBookCatalogProduct): ProtopipeMerchBookCatalogProduct['mockupStyles'] {
    const filter = this.mockupStyleFilter(product.id);
    if (filter === 'all') return product.mockupStyles;
    return product.mockupStyles.filter((s) => s.category === filter);
  }

  mockupStyleCategories(product: ProtopipeMerchBookCatalogProduct): string[] {
    return [...new Set(product.mockupStyles.map((s) => s.category))].sort();
  }

  selectRun(runId: string): void {
    this._activeRunId.set(runId);
    this._section.set('runs');
  }

  async ensureContext(): Promise<void> {
    await this.strategy.ensureLoaded();
    await Promise.all([this.loadCatalog(), this.loadRuns()]);
  }

  async loadPrintfulBrowse(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._printfulBrowseLoading.set(true);
    this._error.set(null);
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        this.api.listPrintfulCatalogCategories(siteId),
        this.api.listPrintfulCatalogProducts(siteId, {
          limit: PRINTFUL_BROWSE_PAGE_SIZE,
          offset: 0,
          categoryId: this._printfulCategoryId() ?? undefined,
        }),
      ]);
      this._printfulCategories.set(categoriesRes.categories);
      this._printfulBrowseLive.set(categoriesRes.printfulLive && productsRes.printfulLive);
      this._printfulProducts.set(productsRes.products);
      this._printfulPaging.set(productsRes.paging);
      this._printfulBrowseLoaded.set(true);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load Printful catalog'));
    } finally {
      this._printfulBrowseLoading.set(false);
    }
  }

  async setPrintfulCategoryFilter(categoryId: number | null): Promise<void> {
    this._printfulCategoryId.set(categoryId);
    this._printfulProductDetail.set(null);
    await this.loadPrintfulProductsPage(0);
  }

  async loadPrintfulProductsPage(offset: number): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._printfulBrowseLoading.set(true);
    try {
      const res = await this.api.listPrintfulCatalogProducts(siteId, {
        limit: PRINTFUL_BROWSE_PAGE_SIZE,
        offset,
        categoryId: this._printfulCategoryId() ?? undefined,
      });
      this._printfulProducts.set(res.products);
      this._printfulPaging.set(res.paging);
      this._printfulBrowseLive.set(res.printfulLive);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load Printful products'));
    } finally {
      this._printfulBrowseLoading.set(false);
    }
  }

  async openPrintfulProduct(catalogProductId: number): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._printfulProductLoading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.getPrintfulCatalogProduct(siteId, catalogProductId, {
        variantLimit: 48,
        variantOffset: 0,
      });
      this._printfulProductDetail.set(res.product);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load product details'));
    } finally {
      this._printfulProductLoading.set(false);
    }
  }

  closePrintfulProductDetail(): void {
    this._printfulProductDetail.set(null);
  }

  async loadMorePrintfulVariants(): Promise<void> {
    const siteId = this.strategy.siteId();
    const detail = this._printfulProductDetail();
    if (!siteId || !detail) return;

    this._printfulProductLoading.set(true);
    try {
      const res = await this.api.getPrintfulCatalogProduct(siteId, detail.id, {
        variantLimit: 48,
        variantOffset: detail.variants.length,
      });
      this._printfulProductDetail.set({
        ...res.product,
        variants: [...detail.variants, ...res.product.variants],
      });
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load more variants'));
    } finally {
      this._printfulProductLoading.set(false);
    }
  }

  async loadStationery(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._stationeryLoading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.listMerchBookStationery(siteId);
      this._stationeryItems.set(res.items);
      this._stationerySubcategories.set(res.subcategories);
      this._stationeryLive.set(res.printfulLive);
      this._stationeryLoaded.set(true);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load greeting card catalog'));
    } finally {
      this._stationeryLoading.set(false);
    }
  }

  setStationerySubcategoryFilter(value: string): void {
    this._stationerySubcategoryFilter.set(value);
  }

  private stationeryMockupCacheKey(itemId: string, styleId: number): string {
    const publicUrl = this._stationeryArtworkPublicUrl();
    return publicUrl ? `${itemId}:${styleId}:${publicUrl}` : `${itemId}:${styleId}`;
  }

  isStationeryPreviewLoading(itemId: string): boolean {
    return this._stationeryPreviewLoadingItemId() === itemId;
  }

  setStationeryPreviewStyleFilter(value: string): void {
    this._stationeryPreviewStyleFilter.set(value);
  }

  closeStationeryPreview(): void {
    this._stationeryPreviewOpen.set(false);
    this._stationeryPreviewItem.set(null);
    this._stationeryPreviewMockupUrl.set(null);
    this._stationeryPreviewError.set(null);
    this._stationeryPreviewLoading.set(false);
    this._stationeryPreviewStyleId.set(null);
    this._stationeryPreviewStyleFilter.set('all');
  }

  async selectStationeryPreviewStyle(styleId: number): Promise<void> {
    const item = this._stationeryPreviewItem();
    if (!item || this._stationeryPreviewStyleId() === styleId) return;
    this._stationeryPreviewStyleId.set(styleId);
    await this.loadStationeryMockupPreview(item, styleId);
  }

  private async loadStationeryMockupPreview(
    item: ProtopipeMerchBookStationeryItem,
    styleId: number,
  ): Promise<void> {
    const siteId = this.strategy.siteId();
    const artworkUrl = this._stationeryArtworkPublicUrl();
    if (!siteId || !artworkUrl) return;

    const cacheKey = this.stationeryMockupCacheKey(item.id, styleId);
    const cached = this._stationeryMockupCache()[cacheKey];
    if (cached) {
      this._stationeryPreviewMockupUrl.set(cached);
      this._stationeryPreviewError.set(null);
      this._stationeryPreviewLoading.set(false);
      return;
    }

    this._stationeryPreviewMockupUrl.set(null);
    this._stationeryPreviewLoading.set(true);
    this._stationeryPreviewLoadingItemId.set(item.id);
    this._stationeryPreviewError.set(null);
    this._error.set(null);

    try {
      const res = await this.api.previewMerchBookStationery(siteId, {
        catalogProductId: item.catalogProductId,
        variantId: item.variantId,
        artworkUrl,
        placement: item.placement,
        techniqueKey: item.techniqueKey,
        mockupStyleId: styleId,
      });
      this._stationeryMockupCache.update((cache) => ({ ...cache, [cacheKey]: res.mockupUrl }));
      this._stationeryPreviewMockupUrl.set(res.mockupUrl);
    } catch (err) {
      const message = parseProtopipeApiError(err, 'Could not generate Printful mockup');
      this._stationeryPreviewError.set(message);
    } finally {
      this._stationeryPreviewLoading.set(false);
      this._stationeryPreviewLoadingItemId.set(null);
    }
  }

  async openStationeryPreview(item: ProtopipeMerchBookStationeryItem): Promise<void> {
    const artworkUrl = this._stationeryArtworkPublicUrl();
    if (!this.strategy.siteId() || !artworkUrl) return;

    const styleId = item.defaultMockupStyleId ?? item.mockupStyles[0]?.id;
    if (styleId == null) {
      this._error.set('No Printful mockup styles available for this size');
      return;
    }

    this._stationeryPreviewItem.set(item);
    this._stationeryPreviewOpen.set(true);
    this._stationeryPreviewStyleFilter.set('all');
    this._stationeryPreviewStyleId.set(styleId);
    await this.loadStationeryMockupPreview(item, styleId);
  }

  clearStationeryArtwork(): void {
    const url = this._stationeryArtworkDisplayUrl();
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this._stationeryArtworkDisplayUrl.set(null);
    this._stationeryArtworkPublicUrl.set(null);
    this._stationeryMockupCache.set({});
    this.closeStationeryPreview();
  }

  async uploadStationeryArtwork(file: File): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;

    this._stationeryUploading.set(true);
    this._error.set(null);
    this._stationeryArtworkPublicUrl.set(null);
    this._stationeryMockupCache.set({});
    this.closeStationeryPreview();

    try {
      const previewUrl = URL.createObjectURL(file);
      const previousDisplay = this._stationeryArtworkDisplayUrl();
      if (previousDisplay?.startsWith('blob:')) {
        URL.revokeObjectURL(previousDisplay);
      }
      this._stationeryArtworkDisplayUrl.set(previewUrl);

      try {
        const presign = await this.api.presignMerchBookStationeryArtwork(siteId, {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });
        const uploadRes = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (uploadRes.ok) {
          URL.revokeObjectURL(previewUrl);
          this._stationeryArtworkDisplayUrl.set(presign.publicUrl);
          this._stationeryArtworkPublicUrl.set(presign.publicUrl);
        }
      } catch {
        // Keep local blob preview when S3 presign is unavailable.
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not upload artwork'));
    } finally {
      this._stationeryUploading.set(false);
    }
  }

  async loadCatalog(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this._catalogLoading.set(true);
    try {
      const res = await this.api.getMerchBookCatalog(siteId);
      this._catalog.set(res.products);
      this._printfulLive.set(res.printfulLive);
      const defaultStyles: Record<string, number> = {};
      for (const product of res.products) {
        if (product.defaultMockupStyleId != null) {
          defaultStyles[product.id] = product.defaultMockupStyleId;
        }
      }
      this._mockupStyleIds.set(defaultStyles);
      if (!this._selectedProductIds().length && res.products.length) {
        this._selectedProductIds.set(res.products.map((p) => p.id));
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load merch catalog'));
    } finally {
      this._catalogLoading.set(false);
    }
  }

  async loadRuns(): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.listMerchBookRuns(siteId);
      this._runs.set(res.runs);
      if (!this._activeRunId() && res.runs.length > 0) {
        this._activeRunId.set(res.runs[0].id);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not load merch runs'));
    } finally {
      this._loading.set(false);
    }
  }

  private upsertRun(run: ProtopipeMerchBookRunDto): void {
    this._runs.update((list) => list.map((r) => (r.id === run.id ? run : r)));
  }

  private async refreshRun(siteId: string, runId: string): Promise<ProtopipeMerchBookRunDto | null> {
    try {
      const res = await this.api.getMerchBookRun(siteId, runId);
      this.upsertRun(res.run);
      return res.run;
    } catch {
      return null;
    }
  }

  private async pollMockupsUntilReady(siteId: string, runId: string): Promise<void> {
    this._mockupsGenerating.set(true);
    try {
      for (let attempt = 0; attempt < MOCKUP_POLL_MAX_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, MOCKUP_POLL_MS));
        const run = await this.refreshRun(siteId, runId);
        if (!run) return;

        const mockups = run.mockups;
        if (!mockups.length) continue;

        const allSettled = mockups.every((m) => m.status === 'ready' || m.status === 'failed');
        if (allSettled) {
          if (mockups.some((m) => m.status === 'ready')) {
            this._section.set('mockups');
          }
          return;
        }
      }
    } finally {
      this._mockupsGenerating.set(false);
    }
  }

  async createRun(): Promise<boolean> {
    const siteId = this.strategy.siteId();
    if (!siteId) {
      this._error.set('No site loaded');
      return false;
    }

    const productIds = this._selectedProductIds();
    if (!productIds.length) {
      this._error.set('Select at least one product for this pack');
      return false;
    }

    this._running.set(true);
    this._error.set(null);
    try {
      const mockupStyleIds: Record<string, number> = {};
      for (const id of productIds) {
        const styleId = this._mockupStyleIds()[id];
        if (styleId != null) mockupStyleIds[id] = styleId;
      }

      const res = await this.api.createMerchBookRun(siteId, {
        label: this._label().trim() || undefined,
        recipe: 'starter_pack',
        logoPrompt: this._logoPrompt().trim() || undefined,
        productIds,
        mockupStyleIds,
      });
      this._runs.update((list) => [res.run, ...list.filter((r) => r.id !== res.run.id)]);
      this._activeRunId.set(res.run.id);
      this._section.set('logo');
      return true;
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Merch run failed'));
      return false;
    } finally {
      this._running.set(false);
    }
  }

  async setLogoConceptStatus(
    runId: string,
    conceptId: string,
    status: 'selected' | 'rejected' | 'pending',
  ): Promise<void> {
    const siteId = this.strategy.siteId();
    if (!siteId) return;
    try {
      const res = await this.api.patchMerchBookLogoConcept(siteId, runId, conceptId, { status });
      this.upsertRun(res.run);

      if (status === 'selected' && res.run.logoConcepts.find((c) => c.id === conceptId)?.imageUrl) {
        void this.pollMockupsUntilReady(siteId, runId);
      }
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not update logo concept'));
    }
  }

  async regenerateMockups(): Promise<void> {
    const siteId = this.strategy.siteId();
    const run = this.activeRun();
    if (!siteId || !run) return;

    this._error.set(null);
    try {
      const res = await this.api.generateMerchBookMockups(siteId, run.id);
      this.upsertRun(res.run);
      void this.pollMockupsUntilReady(siteId, run.id);
    } catch (err) {
      this._error.set(parseProtopipeApiError(err, 'Could not start mockup generation'));
    }
  }
}
