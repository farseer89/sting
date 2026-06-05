import { Injectable, inject, signal } from '@angular/core';
import type { StrategyWriterPanelId } from './strategy/strategy-writer.mock';
import { ProtopipeHomeSidePanelService } from './protopipe-home-side-panel.service';

@Injectable()
export class ProtopipeHomeWriterViewState {
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly _activePanel = signal<StrategyWriterPanelId | null>(null);
  private readonly _activePostId = signal<string | null>(null);
  private readonly _createMode = signal(false);
  private exitHandler: (() => void) | null = null;

  readonly activePanel = this._activePanel.asReadonly();
  readonly activePostId = this._activePostId.asReadonly();
  readonly createMode = this._createMode.asReadonly();

  setExitHandler(handler: () => void): void {
    this.exitHandler = handler;
  }

  selectPanel(id: StrategyWriterPanelId): void {
    if (this._activePanel() === id) {
      this._activePanel.set(null);
      this.sidePanel.setOpen(false);
      return;
    }
    this._activePanel.set(id);
    this.sidePanel.ensureOpen();
  }

  isPanel(id: StrategyWriterPanelId): boolean {
    return this._activePanel() === id;
  }

  openPost(postId: string): void {
    this._createMode.set(false);
    this._activePostId.set(postId);
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
  }

  exitFocus(): void {
    this.clearPanel();
    this.clearSession();
    this.sidePanel.setOpen(false);
    this.exitHandler?.();
  }
}
