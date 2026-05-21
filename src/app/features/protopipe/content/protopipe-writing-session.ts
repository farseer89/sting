import type { ProtopipeContentSection, ProtopipeContentTemplate } from '@hive/contracts';

export interface WritingSession {
  template: ProtopipeContentTemplate;
  slug: string;
  scheduleAt: Date | null;
  selectedKeywordId: string | null;
  focusedSectionIndex: number;
  readOnly: boolean;
}

export function cloneTemplate(t: ProtopipeContentTemplate): ProtopipeContentTemplate {
  return {
    ...t,
    sections: t.sections.map((s) => ({
      ...s,
      images: [...(s.images ?? [])],
    })),
    internalLinks: [...(t.internalLinks ?? [])],
  };
}

export function patchSection(
  template: ProtopipeContentTemplate,
  index: number,
  partial: Partial<ProtopipeContentSection>,
): ProtopipeContentTemplate {
  const sections = [...template.sections];
  sections[index] = { ...sections[index], ...partial };
  return { ...template, sections };
}
