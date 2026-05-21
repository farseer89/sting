import type { ProtopipeContentTemplate, ProtopipeKeywordDto } from '@hive/contracts';

function titleCasePhrase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** One-click starter copy when the writer picks a plan keyword. */
export function buildKeywordSuggestions(keyword: ProtopipeKeywordDto): {
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  sectionHeadings: string[];
} {
  const phrase = keyword.phrase.trim();
  const titled = titleCasePhrase(phrase);
  return {
    title: `${titled} for Destination Weddings`,
    h1: `${titled} at Your Destination Wedding`,
    metaDescription:
      `Discover ${phrase} for destination weddings — what to expect, how it works, and how to book. Written for couples planning abroad.`,
    intro:
      `Couples searching for ${phrase} want clarity on process, timeline, and what makes the experience special. ` +
      `This guide walks through what to expect and how to take the next step.`,
    sectionHeadings: [
      `What is ${phrase}?`,
      'How the process works',
      'Why couples book early',
      'Questions to ask before you commit',
    ],
  };
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export type ApplyKeywordMode = 'fill' | 'replace';

/** Apply keyword starter copy. `fill` only touches empty fields; `replace` refreshes SEO + outline. */
export function applyKeywordToTemplate(
  template: ProtopipeContentTemplate,
  keyword: ProtopipeKeywordDto,
  options?: { mode?: ApplyKeywordMode; introOverride?: string },
): ProtopipeContentTemplate {
  const s = buildKeywordSuggestions(keyword);
  const mode = options?.mode ?? 'fill';

  if (mode === 'replace') {
    const sections = s.sectionHeadings.map((h2, i) => ({
      h2,
      body: template.sections[i]?.body ?? '',
      images: template.sections[i]?.images ?? [],
    }));
    return {
      ...template,
      primaryKeywordId: keyword.id,
      primaryKeywordPhrase: keyword.phrase,
      title: s.title,
      h1: s.h1,
      metaDescription: s.metaDescription,
      intro: options?.introOverride?.trim() || s.intro,
      sections,
    };
  }

  const sections = [...template.sections];
  for (let i = 0; i < s.sectionHeadings.length; i++) {
    if (!sections[i]) {
      sections.push({ h2: '', body: '', images: [] });
    }
    if (!sections[i].h2?.trim()) {
      sections[i] = { ...sections[i], h2: s.sectionHeadings[i] };
    }
  }
  return {
    ...template,
    primaryKeywordId: keyword.id,
    primaryKeywordPhrase: keyword.phrase,
    title: template.title.trim() ? template.title : s.title,
    h1: template.h1.trim() ? template.h1 : s.h1,
    metaDescription: template.metaDescription.trim() ? template.metaDescription : s.metaDescription,
    intro: template.intro.trim() ? template.intro : s.intro,
    sections,
  };
}

export interface WritingHint {
  id: string;
  label: string;
  done: boolean;
}

/** Soft progress hints while writing — not publish validation. */
export function writingHints(template: ProtopipeContentTemplate): WritingHint[] {
  const kw = template.primaryKeywordPhrase.trim().toLowerCase();
  const inText = (text: string) =>
    kw ? text.toLowerCase().includes(kw) : false;

  const metaLen = template.metaDescription.length;
  const metaOk = metaLen >= 140 && metaLen <= 160;

  const words = [template.intro, ...template.sections.map((s) => s.body)]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return [
    { id: 'keyword', label: 'Keyword chosen', done: !!kw },
    { id: 'title', label: 'Title for search', done: !!template.title.trim() },
    { id: 'h1', label: 'Page headline', done: !!template.h1.trim() },
    {
      id: 'meta',
      label: metaOk ? 'Meta description length' : 'Meta description (140–160 chars)',
      done: metaOk,
    },
    {
      id: 'intro-kw',
      label: 'Keyword in opening',
      done: !kw || inText(template.intro),
    },
    { id: 'sections', label: 'At least one section', done: template.sections.some((s) => s.h2.trim()) },
    { id: 'words', label: 'Substantial draft (300+ words)', done: words >= 300 },
  ];
}

export interface ArticleIdea {
  keywordId: string;
  phrase: string;
  angle: string;
}

/** Topic angles from the keyword plan for the writing tools panel. */
export function buildArticleIdeas(
  keywords: ProtopipeKeywordDto[],
  selectedKeywordId: string | null,
): ArticleIdea[] {
  return keywords
    .filter((k) => k.id !== selectedKeywordId)
    .map((k) => ({
      keywordId: k.id,
      phrase: k.phrase,
      angle:
        k.notes?.trim() ||
        `Guide for couples searching “${k.phrase}” — process, benefits, and how to book.`,
    }));
}

export function serpPreview(input: {
  title: string;
  metaDescription: string;
  slug: string;
  siteHost?: string;
}): { url: string; title: string; description: string } {
  const host = input.siteHost?.replace(/^https?:\/\//, '') || 'yoursite.com';
  const slug = input.slug.replace(/^\/+|\/+$/g, '') || 'your-post';
  return {
    url: `https://${host}/blog/${slug}/`,
    title: input.title.trim() || 'Untitled post',
    description:
      input.metaDescription.trim() ||
      'Add a short meta description — it appears under your title in search results.',
  };
}
