export type WriterInspectorPanelId =
  | 'brief'
  | 'preview'
  | 'blog'
  | 'layout'
  | 'hints'
  | 'seo'
  | 'behind'
  | 'facts';

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

export function writerInspectorPanelLabel(id: WriterInspectorPanelId | null): string {
  if (!id) return 'Writer tools';
  return WRITER_INSPECTOR_PANELS.find((p) => p.id === id)?.label ?? 'Writer tools';
}
