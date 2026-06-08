import { Injectable, TemplateRef, signal } from '@angular/core';

/** Shares writer inspector template with the home right slider when embedded. */
@Injectable()
export class ProtopipeWriterInspectorBridge {
  readonly template = signal<TemplateRef<unknown> | null>(null);

  setTemplate(ref: TemplateRef<unknown> | null): void {
    this.template.set(ref);
  }

  clear(): void {
    this.template.set(null);
  }
}
