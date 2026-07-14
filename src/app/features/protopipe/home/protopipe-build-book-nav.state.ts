import { Injectable, signal } from '@angular/core';

export interface BuildBookArticlePreviewRequest {
  contentPostId: string;
  title?: string;
}

/** Cross-view handoff: Thinker/Calendar → Build Book Content Posts article preview. */
@Injectable({ providedIn: 'root' })
export class ProtopipeBuildBookNavState {
  private readonly _articlePreviewRequest = signal<BuildBookArticlePreviewRequest | null>(null);

  readonly articlePreviewRequest = this._articlePreviewRequest.asReadonly();

  requestArticlePreview(contentPostId: string, title?: string): void {
    const id = contentPostId.trim();
    if (!id) return;
    this._articlePreviewRequest.set({
      contentPostId: id,
      title: title?.trim() || undefined,
    });
  }

  consumeArticlePreviewRequest(): BuildBookArticlePreviewRequest | null {
    const next = this._articlePreviewRequest();
    if (next) this._articlePreviewRequest.set(null);
    return next;
  }
}
