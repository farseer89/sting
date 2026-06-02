import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as ProseNode } from '@tiptap/pm/model';

export interface FactHighlightItem {
  id: string;
  /** Verbatim text span from the body to highlight. */
  claim: string;
  severity: 'critical' | 'minor';
  /** Resolved facts (confirmed/dismissed) stop highlighting. */
  resolved: boolean;
  /** The claim whose popover is currently open — gets a stronger treatment. */
  selected?: boolean;
}

export interface FactHighlightOptions {
  /** Called when the user clicks a highlighted claim. */
  onFactClick?: (factId: string, rect: DOMRect) => void;
}

export interface FactHighlightStorage {
  facts: FactHighlightItem[];
}

export const factHighlightKey = new PluginKey('protopipeFactHighlight');

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

/**
 * Locate every active (unresolved) claim as a verbatim substring inside each
 * textblock and map it to ProseMirror document positions. Recomputed on every
 * doc change, so highlights re-anchor automatically and silently drop once the
 * underlying text is edited away.
 */
function findFactRanges(doc: ProseNode, facts: FactHighlightItem[]): FactRange[] {
  const active = facts.filter((f) => !f.resolved && f.claim.trim());
  if (!active.length) return [];
  const ranges: FactRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textContent;
    if (!text) return;
    const base = pos + 1;
    for (const fact of active) {
      const needle = fact.claim.trim();
      let at = text.indexOf(needle);
      while (at !== -1) {
        ranges.push({ fact, from: base + at, to: base + at + needle.length });
        at = text.indexOf(needle, at + needle.length);
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
    return Decoration.inline(r.from, r.to, {
      class: classes.join(' '),
      'data-fact-id': r.fact.id,
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
 * Inline decorations for reviewer-flagged claims, with click-to-resolve. The
 * fact list lives in editor storage and is refreshed via `setFlaggedFacts`.
 */
export const FactHighlight = Extension.create<FactHighlightOptions, FactHighlightStorage>({
  name: 'protopipeFactHighlight',

  addOptions() {
    return { onFactClick: undefined };
  },

  addStorage() {
    return { facts: [] };
  },

  addCommands() {
    return {
      setFlaggedFacts:
        (facts) =>
        ({ editor, tr, dispatch }) => {
          editor.storage['protopipeFactHighlight'].facts = facts ?? [];
          if (dispatch) {
            tr.setMeta(factHighlightKey, true);
            dispatch(tr);
          }
          return true;
        },
      selectFact:
        (factId) =>
        ({ editor, tr, dispatch, view }) => {
          const facts: FactHighlightItem[] = editor.storage['protopipeFactHighlight'].facts;
          const target = facts.find((f) => f.id === factId);
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
          const target = facts.find((f) => f.id === factId);
          if (!target) return false;
          const ranges = findFactRanges(tr.doc, [{ ...target, resolved: false }]);
          if (!ranges.length) return false;
          const { from } = ranges[0];
          if (dispatch) {
            // Collapsed caret so we scroll the claim into view without opening
            // the selection bubble menu.
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
        props: {
          decorations(state) {
            return buildDecorations(state.doc, extension.storage.facts);
          },
          handleClick(view: EditorView, pos: number, event: MouseEvent) {
            const fact = factAt(view.state.doc, extension.storage.facts, pos);
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
