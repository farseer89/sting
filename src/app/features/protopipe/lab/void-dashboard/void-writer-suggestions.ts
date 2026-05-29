export type AiSuggestionAnchor = 'title' | 'intro' | 'section';
export type AiSuggestionAction =
  | 'insert-intro'
  | 'insert-section-body'
  | 'append-section-body'
  | 'none';

export interface AiSuggestion {
  id: string;
  anchor: AiSuggestionAnchor;
  sectionIndex?: number;
  side: 'left' | 'right';
  label: string;
  peek: string;
  text: string;
  action: AiSuggestionAction;
  /** Hide when this returns false */
  when?: (ctx: AiSuggestionContext) => boolean;
}

export interface AiSuggestionContext {
  intro: string;
  h1: string;
  sections: { h2: string; body: string }[];
}

export const VOID_WRITER_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'intro-open',
    anchor: 'intro',
    side: 'left',
    label: 'Opening',
    peek: 'Couples searching…',
    text:
      'Couples searching for how much does a wedding painter cost want clarity on process, timeline, and what makes the experience special. This guide walks through what to expect and how to take the next step.',
    action: 'insert-intro',
    when: (ctx) => !ctx.intro.trim(),
  },
  {
    id: 'title-keyword',
    anchor: 'title',
    side: 'right',
    label: 'Headline',
    peek: 'Lead with keyword',
    text: 'Lead with the search phrase in plain language — e.g. “How Much Does a Wedding Painter Cost?”',
    action: 'none',
    when: () => true,
  },
  {
    id: 'intro-range',
    anchor: 'intro',
    side: 'right',
    label: 'Search intent',
    peek: 'Add a range',
    text: 'Searchers often want a ballpark. One sentence with a range ($2,500–$6,000) can lift click-through without over-promising.',
    action: 'append-section-body',
    sectionIndex: 0,
    when: (ctx) => !!ctx.intro.trim() && !ctx.intro.toLowerCase().includes('$'),
  },
  {
    id: 'sec-0-range',
    anchor: 'section',
    sectionIndex: 0,
    side: 'right',
    label: 'Pricing',
    peek: 'Typical range',
    text: 'Most destination wedding painters quote $2,500–$6,000 depending on travel, canvas size, and hours on-site.',
    action: 'insert-section-body',
    when: (ctx) => !(ctx.sections[0]?.body.trim()),
  },
  {
    id: 'sec-1-deposit',
    anchor: 'section',
    sectionIndex: 1,
    side: 'left',
    label: 'Process',
    peek: 'Deposit detail',
    text: 'Note when deposits are due and what happens if plans change — couples planning abroad care about flexibility.',
    action: 'append-section-body',
    when: (ctx) => {
      const body = ctx.sections[1]?.body ?? '';
      return !!body.trim() && !body.toLowerCase().includes('deposit');
    },
  },
  {
    id: 'sec-2-early',
    anchor: 'section',
    sectionIndex: 2,
    side: 'left',
    label: 'Section draft',
    peek: 'Why book early',
    text:
      'Popular painters book six to twelve months out for destination dates. Early booking secures travel logistics and gives the artist time to plan materials and composition.',
    action: 'insert-section-body',
    when: (ctx) => !(ctx.sections[2]?.body.trim()),
  },
  {
    id: 'sec-3-questions',
    anchor: 'section',
    sectionIndex: 3,
    side: 'right',
    label: 'Section draft',
    peek: 'Questions list',
    text:
      'Ask about travel fees, canvas sizes, ceremony vs reception coverage, rain plans, and how long until the finished piece ships home.',
    action: 'insert-section-body',
    when: (ctx) => !(ctx.sections[3]?.body.trim()),
  },
];

export function activeAiSuggestions(
  defs: AiSuggestion[],
  ctx: AiSuggestionContext,
  dismissed: ReadonlySet<string>,
): AiSuggestion[] {
  return defs.filter((s) => !dismissed.has(s.id) && (s.when?.(ctx) ?? true));
}
