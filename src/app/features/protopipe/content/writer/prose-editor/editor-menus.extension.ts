import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export interface MenuSelectionInfo {
  text: string;
  rect: DOMRect;
}

export interface MenuSlashInfo {
  query: string;
  /** Range of the `/query` token, for deletion before inserting. */
  from: number;
  to: number;
  rect: DOMRect;
}

export interface EditorMenusOptions {
  /** Non-empty text selection (bubble menu) or null when collapsed. */
  onSelection?: (info: MenuSelectionInfo | null) => void;
  /** Active `/slash` token at the cursor, or null. */
  onSlash?: (info: MenuSlashInfo | null) => void;
}

export const editorMenusKey = new PluginKey('protopipeEditorMenus');

function rectFromCoords(coords: { top: number; bottom: number; left: number; right: number }): DOMRect {
  return new DOMRect(
    coords.left,
    coords.top,
    Math.max(0, coords.right - coords.left),
    Math.max(0, coords.bottom - coords.top),
  );
}

/**
 * Emits selection (bubble menu) and slash-command state up to Angular. Pure
 * observer: it never mutates the document, so it is safe to layer onto the
 * shared prose editor.
 */
export const EditorMenus = Extension.create<EditorMenusOptions>({
  name: 'protopipeEditorMenus',

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const options = this.options;

    const emit = (view: EditorView): void => {
      const { state } = view;
      const { selection } = state;
      const { $from, empty } = selection;

      if (!empty) {
        options.onSlash?.(null);
        const text = state.doc.textBetween(selection.from, selection.to, ' ');
        if (text.trim()) {
          options.onSelection?.({
            text,
            rect: rectFromCoords(view.coordsAtPos(selection.from)),
          });
        } else {
          options.onSelection?.(null);
        }
        return;
      }

      options.onSelection?.(null);

      // Slash command: a `/word` token occupying the whole current textblock.
      const blockText = $from.parent.textContent;
      const match = /^\/([a-zA-Z]*)$/.exec(blockText);
      if (match && $from.parentOffset === $from.parent.content.size) {
        const from = $from.start();
        const to = $from.pos;
        options.onSlash?.({
          query: match[1],
          from,
          to,
          rect: rectFromCoords(view.coordsAtPos(to)),
        });
      } else {
        options.onSlash?.(null);
      }
    };

    return [
      new Plugin({
        key: editorMenusKey,
        view() {
          return {
            update(view, prevState) {
              if (
                prevState.doc.eq(view.state.doc) &&
                prevState.selection.eq(view.state.selection)
              ) {
                return;
              }
              emit(view);
            },
          };
        },
      }),
    ];
  },
});
