import { Injectable, inject, signal } from '@angular/core';
import type { WritingBookPanelId } from '../content/writer/protopipe-writer-panels';
import { ProtopipeHomeSidePanelService } from './protopipe-home-side-panel.service';

@Injectable()
export class ProtopipeHomeWriterViewState {
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly _activePanel = signal<WritingBookPanelId>('canvas');
  private readonly _activePostId = signal<string | null>(null);
  private readonly _createMode = signal(false);
  private readonly _autoStartPipeline = signal(false);
  private readonly _pendingCognitivePackId = signal<string | null>(null);
  private exitHandler: (() => void) | null = null;

  readonly activePanel = this._activePanel.asReadonly();
  readonly activePostId = this._activePostId.asReadonly();
  readonly createMode = this._createMode.asReadonly();
  readonly autoStartPipeline = this._autoStartPipeline.asReadonly();

  setExitHandler(handler: () => void): void {
    this.exitHandler = handler;
  }

  selectPanel(id: WritingBookPanelId): void {
    this._activePanel.set(id);
  }

  openPanel(id: WritingBookPanelId): void {
    this._activePanel.set(id);
  }

  isPanel(id: WritingBookPanelId): boolean {
    return this._activePanel() === id;
  }

  openPost(postId: string): void {
    this._createMode.set(false);
    this._activePostId.set(postId);
    this._autoStartPipeline.set(false);
    this._activePanel.set('canvas');
  }

  /** Open a plan-backed post and start the article pipeline once the writer loads. */
  openPostForWriting(postId: string): void {
    this._createMode.set(false);
    this._activePostId.set(postId);
    this._autoStartPipeline.set(true);
    this._activePanel.set('behind');
  }

  consumeAutoStartPipeline(): boolean {
    const pending = this._autoStartPipeline();
    if (pending) {
      this._autoStartPipeline.set(false);
    }
    return pending;
  }

  setPendingCognitivePackId(packId: string): void {
    this._pendingCognitivePackId.set(packId);
  }

  consumePendingCognitivePackId(): string | null {
    const pending = this._pendingCognitivePackId();
    if (pending) {
      this._pendingCognitivePackId.set(null);
    }
    return pending;
  }

  openCreate(): void {
    this._createMode.set(true);
    this._activePostId.set(null);
    this._activePanel.set('canvas');
  }

  clearPanel(): void {
    this._activePanel.set('canvas');
    this.sidePanel.setOpen(false);
  }

  clearSession(): void {
    this._activePostId.set(null);
    this._createMode.set(false);
    this._autoStartPipeline.set(false);
    this._pendingCognitivePackId.set(null);
    this._activePanel.set('canvas');
  }

  exitFocus(): void {
    this.exitHandler?.();
  }
}
