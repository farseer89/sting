import { Injectable, inject, signal } from '@angular/core';
import type { StrategyWriterPanelId } from './strategy/strategy-writer.mock';
import { ProtopipeHomeSidePanelService } from './protopipe-home-side-panel.service';

@Injectable()
export class ProtopipeHomeWriterViewState {
  private readonly sidePanel = inject(ProtopipeHomeSidePanelService);
  private readonly _activePanel = signal<StrategyWriterPanelId | null>(null);
  private exitHandler: (() => void) | null = null;

  readonly activePanel = this._activePanel.asReadonly();

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

  clearPanel(): void {
    this._activePanel.set(null);
  }

  exitFocus(): void {
    this.clearPanel();
    this.sidePanel.setOpen(false);
    this.exitHandler?.();
  }
}
