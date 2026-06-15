import { Injectable, inject, signal } from '@angular/core';
import type { WriterInspectorPanelId } from '../content/writer/protopipe-writer-panels';
import { ProtopipeHomeSidePanelService } from './protopipe-home-side-panel.service';

@Injectable()
export class ProtopipeHomeWriterViewState {
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly _activePanel = signal<WriterInspectorPanelId | null>(null);
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

  selectPanel(id: WriterInspectorPanelId): void {
    if (this._activePanel() === id) {
      this._activePanel.set(null);
      this.sidePanel.setOpen(false);
      return;
    }
    this.openPanel(id);
  }

  openPanel(id: WriterInspectorPanelId): void {
    this._activePanel.set(id);
    this.sidePanel.ensureOpen();
  }

  isPanel(id: WriterInspectorPanelId): boolean {
    return this._activePanel() === id;
  }

  openPost(postId: string): void {
    this._createMode.set(false);
    this._activePostId.set(postId);
    this._autoStartPipeline.set(false);
  }

  /** Open a plan-backed post and start the article pipeline once the writer loads. */
  openPostForWriting(postId: string): void {
    this._createMode.set(false);
    this._activePostId.set(postId);
    this._autoStartPipeline.set(true);
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
  }

  clearPanel(): void {
    this._activePanel.set(null);
  }

  clearSession(): void {
    this._activePostId.set(null);
    this._createMode.set(false);
    this._autoStartPipeline.set(false);
    this._pendingCognitivePackId.set(null);
  }

  exitFocus(): void {
    this.clearPanel();
    this.clearSession();
    this.sidePanel.setOpen(false);
    this.exitHandler?.();
  }
}
