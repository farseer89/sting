/** MVP Writing book binder panels. */
export type WritingBookPanelId = 'canvas' | 'brief' | 'behind' | 'seo' | 'facts';

/** @deprecated Use WritingBookPanelId — retained for deferred tier panels. */
export type WriterInspectorPanelId =
  | 'brief'
  | 'preview'
  | 'blog'
  | 'layout'
  | 'hints'
  | 'seo'
  | 'behind'
  | 'facts';

export const WRITING_BOOK_MVP_PANELS: { id: WritingBookPanelId; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'brief', label: 'Brief' },
  { id: 'behind', label: 'Generation' },
  { id: 'seo', label: 'SEO & schedule' },
  { id: 'facts', label: 'Fact check' },
];

export const WRITER_INSPECTOR_PANELS: { id: WriterInspectorPanelId; label: string }[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'preview', label: 'Search preview' },
  { id: 'blog', label: 'Blog preview' },
  { id: 'layout', label: 'Layout slots' },
  { id: 'hints', label: 'Hints' },
  { id: 'seo', label: 'SEO & schedule' },
  { id: 'behind', label: 'Behind the curtain' },
  { id: 'facts', label: 'Fact check' },
];

export function writingBookPanelLabel(id: WritingBookPanelId): string {
  return WRITING_BOOK_MVP_PANELS.find((p) => p.id === id)?.label ?? 'Writing book';
}

export function writerInspectorPanelLabel(id: WriterInspectorPanelId | null): string {
  if (!id) return 'Writer tools';
  return WRITER_INSPECTOR_PANELS.find((p) => p.id === id)?.label ?? 'Writer tools';
}
