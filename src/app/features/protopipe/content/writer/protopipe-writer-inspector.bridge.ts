import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Shares writer inspector template with the home right slider when embedded.
 * Must be provided once on protopipe-user-home (writer + context panel are siblings).
 */
@Injectable()
export class ProtopipeWriterInspectorBridge {
  readonly template = signal<TemplateRef<unknown> | null>(null);
  /** Bumped when the active inspector tab changes so the home slider re-renders. */
  readonly panelRevision = signal(0);

  setTemplate(ref: TemplateRef<unknown> | null): void {
    this.template.set(ref);
  }

  notifyPanelChange(): void {
    this.panelRevision.update((n) => n + 1);
  }

  clear(): void {
    this.template.set(null);
    this.panelRevision.set(0);
  }
}
