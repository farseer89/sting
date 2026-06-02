import { Editor } from '@tiptap/core';
import { buildProseExtensions } from './prose-editor-extensions';

/**
 * Round-trip the markdown subset our publish pipeline emits through a headless
 * TipTap editor. The published `.md` is the section bodies concatenated
 * verbatim, so drift here would corrupt real articles.
 */
function roundTrip(markdown: string): string {
  const editor = new Editor({
    extensions: buildProseExtensions(),
    content: markdown,
  });
  try {
    const storage = editor.storage as { markdown: { getMarkdown(): string } };
    return storage.markdown.getMarkdown();
  } finally {
    editor.destroy();
  }
}

describe('prose-editor markdown round-trip', () => {
  it('preserves a plain paragraph', () => {
    const md = 'A single straightforward paragraph of body copy.';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves two paragraphs', () => {
    const md = 'First paragraph here.\n\nSecond paragraph here.';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves bold and italic', () => {
    const md = 'This is **bold** and this is *italic* text.';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves a bullet list', () => {
    const md = '- First item\n- Second item\n- Third item';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves an ordered list', () => {
    const md = '1. First step\n2. Second step\n3. Third step';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves inline links', () => {
    const md = 'See [our portfolio](https://example.com/portfolio) for details.';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves a blockquote', () => {
    const md = '> A quoted line of guidance.';
    expect(roundTrip(md)).toBe(md);
  });

  it('preserves paragraph followed by a list', () => {
    const md = 'Here is what to bring:\n\n- Sunscreen\n- Water\n- A hat';
    expect(roundTrip(md)).toBe(md);
  });

  it('does not emit raw HTML', () => {
    const md = 'Plain text with a [link](https://example.com) only.';
    const out = roundTrip(md);
    expect(out).not.toMatch(/<[a-z]/i);
  });

  it('is idempotent across a second pass', () => {
    const md = 'Intro paragraph.\n\n- Item one\n- Item two\n\nClosing **paragraph**.';
    const once = roundTrip(md);
    const twice = roundTrip(once);
    expect(twice).toBe(once);
  });
});
