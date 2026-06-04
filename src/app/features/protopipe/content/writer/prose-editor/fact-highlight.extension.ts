import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as ProseNode } from '@tiptap/pm/model';
import { normalizeClaimText } from './claim-match';
import {
  buildFlatTextIndex,
  rangeFromFlatMatch,
  type FlatTextIndex,
} from './text-block-index';

export interface FactHighlightItem {
  id: string;
  /** Verbatim text span from the body to highlight. */
  claim: string;
  severity: 'critical' | 'minor';
  /** Resolved facts (confirmed/dismissed) stop highlighting. */
  resolved: boolean;
  /** Body changed since review — skip inline highlight. */
  stale?: boolean;
  /** Char offsets in the reviewed markdown field (when offsetsReliable). */
  claimStart?: number;
  claimEnd?: number;
  useOffsets?: boolean;
  /** The claim whose popover is currently open — gets a stronger treatment. */
  selected?: boolean;
  /** Shown as a native tooltip on the inline highlight. */
  suggestion?: string;
}

export interface FactHighlightOptions {
  /** Called when the user clicks a highlighted claim. */
  onFactClick?: (factId: string, rect: DOMRect) => void;
}

export interface FactHighlightPluginState {
  facts: FactHighlightItem[];
}

export const factHighlightKey = new PluginKey<FactHighlightPluginState>('protopipeFactHighlight');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    protopipeFactHighlight: {
      setFlaggedFacts: (facts: FactHighlightItem[]) => ReturnType;
      selectFact: (factId: string) => ReturnType;
      revealFact: (factId: string) => ReturnType;
    };
  }
}

interface FactRange {
  fact: FactHighlightItem;
  from: number;
  to: number;
}

function findNeedleInFlat(index: FlatTextIndex, needle: string): number {
  const exact = index.text.indexOf(needle);
  if (exact !== -1) return exact;

  const normalizedHay = normalizeClaimText(index.text);
  const normalizedNeedle = normalizeClaimText(needle);
  if (!normalizedNeedle) return -1;
  const at = normalizedHay.indexOf(normalizedNeedle);
  if (at === -1) return -1;

  // Map normalized offset back to raw text (same length when only case/dash differs).
  if (normalizeClaimText(index.text.slice(at, at + needle.length)) === normalizedNeedle) {
    return at;
  }

  // Walk raw text for first window matching normalized needle.
  for (let i = 0; i <= index.text.length - needle.length; i++) {
    if (normalizeClaimText(index.text.slice(i, i + needle.length)) === normalizedNeedle) {
      return i;
    }
  }
  for (let len = needle.length; len >= Math.min(12, needle.length); len--) {
    const sub = needle.slice(0, len);
    const idx = index.text.indexOf(sub);
    if (idx !== -1 && normalizeClaimText(sub).length >= 8) return idx;
  }
  return -1;
}

/**
 * Locate active claims inside each textblock using true document positions.
 * Recomputed on every doc change so highlights track edits.
 */
function tryOffsetRange(
  flat: FlatTextIndex,
  fact: FactHighlightItem,
): { from: number; to: number } | null {
  if (!fact.useOffsets || fact.claimStart == null || fact.claimEnd == null) return null;
  const start = fact.claimStart;
  const length = fact.claimEnd - start;
  if (length <= 0 || start < 0 || start + length > flat.text.length) return null;
  const slice = flat.text.slice(start, start + length);
  if (normalizeClaimText(slice) !== normalizeClaimText(fact.claim.trim())) return null;
  return rangeFromFlatMatch(flat, start, length);
}

export function findFactRanges(doc: ProseNode, facts: FactHighlightItem[]): FactRange[] {
  const active = facts.filter((f) => !f.resolved && !f.stale && f.claim.trim());
  if (!active.length) return [];

  const ranges: FactRange[] = [];
  const offsetMatched = new Set<string>();

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const flat = buildFlatTextIndex(node, pos);
    if (!flat.text) return;

    for (const fact of active) {
      if (offsetMatched.has(fact.id)) continue;

      const offsetSpan = tryOffsetRange(flat, fact);
      if (offsetSpan) {
        ranges.push({ fact, from: offsetSpan.from, to: offsetSpan.to });
        offsetMatched.add(fact.id);
        continue;
      }

      const needle = fact.claim.trim();
      const positions: number[] = [];
      let at = flat.text.indexOf(needle);
      while (at !== -1) {
        positions.push(at);
        at = flat.text.indexOf(needle, at + needle.length);
      }
      if (!positions.length) {
        const fuzzy = findNeedleInFlat(flat, needle);
        if (fuzzy !== -1) positions.push(fuzzy);
      }
      for (const start of positions) {
        const span = rangeFromFlatMatch(flat, start, needle.length);
        if (span) ranges.push({ fact, from: span.from, to: span.to });
      }
    }
  });
  return ranges;
}

function buildDecorations(doc: ProseNode, facts: FactHighlightItem[]): DecorationSet {
  const ranges = findFactRanges(doc, facts);
  if (!ranges.length) return DecorationSet.empty;
  const decorations = ranges.map((r) => {
    const classes = ['pw-fact-mark', `pw-fact-mark--${r.fact.severity}`];
    if (r.fact.selected) classes.push('pw-fact-mark--selected');
    const tip = r.fact.suggestion?.trim();
    return Decoration.inline(r.from, r.to, {
      class: classes.join(' '),
      'data-fact-id': r.fact.id,
      title: tip
        ? `${r.fact.severity === 'critical' ? 'Critical' : 'Review'}: ${tip}`
        : 'Flagged claim — click to review',
    });
  });
  return DecorationSet.create(doc, decorations);
}

function factAt(doc: ProseNode, facts: FactHighlightItem[], pos: number): FactHighlightItem | null {
  for (const r of findFactRanges(doc, facts)) {
    if (pos >= r.from && pos <= r.to) return r.fact;
  }
  return null;
}

/**
 * Inline decorations for reviewer-flagged claims, with click-to-resolve.
 */
export const FactHighlight = Extension.create<FactHighlightOptions, FactHighlightPluginState>({
  name: 'protopipeFactHighlight',

  addOptions() {
    return { onFactClick: undefined };
  },

  addStorage() {
    return { facts: [] as FactHighlightItem[] };
  },

  addCommands() {
    return {
      setFlaggedFacts:
        (facts) =>
        ({ editor, tr, dispatch }) => {
          const list = facts ?? [];
          editor.storage['protopipeFactHighlight'].facts = list;
          if (dispatch) {
            tr.setMeta(factHighlightKey, { facts: list });
            dispatch(tr);
          }
          return true;
        },
      selectFact:
        (factId) =>
        ({ editor, tr, dispatch, view }) => {
          const facts: FactHighlightItem[] = editor.storage['protopipeFactHighlight'].facts;
          const target = facts.find((f: FactHighlightItem) => f.id === factId);
          if (!target) return false;
          const ranges = findFactRanges(tr.doc, [{ ...target, resolved: false }]);
          if (!ranges.length) return false;
          const { from, to } = ranges[0];
          if (dispatch) {
            tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView();
            dispatch(tr);
            view.focus();
          }
          return true;
        },
      revealFact:
        (factId) =>
        ({ editor, tr, dispatch }) => {
          const facts: FactHighlightItem[] = editor.storage['protopipeFactHighlight'].facts;
          const target = facts.find((f: FactHighlightItem) => f.id === factId);
          if (!target) return false;
          const ranges = findFactRanges(tr.doc, [{ ...target, resolved: false }]);
          if (!ranges.length) return false;
          const { from } = ranges[0];
          if (dispatch) {
            tr.setSelection(TextSelection.create(tr.doc, from)).scrollIntoView();
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: factHighlightKey,
        state: {
          init: (): FactHighlightPluginState => ({ facts: [] }),
          apply(tr, value): FactHighlightPluginState {
            const meta = tr.getMeta(factHighlightKey) as FactHighlightPluginState | undefined;
            if (meta?.facts) return meta;
            return value;
          },
        },
        props: {
          decorations(state) {
            const pluginFacts = factHighlightKey.getState(state)?.facts;
            const facts = pluginFacts ?? extension.storage.facts;
            return buildDecorations(state.doc, facts);
          },
          handleClick(view: EditorView, pos: number, event: MouseEvent) {
            const facts =
              factHighlightKey.getState(view.state)?.facts ?? extension.storage.facts;
            const fact = factAt(view.state.doc, facts, pos);
            if (!fact) return false;
            const handler = extension.options.onFactClick;
            if (!handler) return false;
            const el = event.target as HTMLElement | null;
            const rect = el?.getBoundingClientRect() ?? new DOMRect(event.clientX, event.clientY);
            handler(fact.id, rect);
            return true;
          },
        },
      }),
    ];
  },
});
