import { describe, expect, it } from 'vitest';
import {
  markdownToPreviewHtml,
  stripLeadingMarkdownHeading,
} from './markdown-preview.util';

describe('markdown-preview.util', () => {
  it('strips a leading heading that matches the block heading', () => {
    const body = '## Why Maui portraits differ\n\nMost couples leave with photos.';
    expect(stripLeadingMarkdownHeading(body, 'Why Maui portraits differ')).toBe(
      'Most couples leave with photos.',
    );
  });

  it('renders paragraphs, lists, and subheads as safe HTML', () => {
    const html = markdownToPreviewHtml(
      '### Subhead\n\nA **bold** line.\n\n- One\n- Two\n\n<script>x</script>',
    );
    expect(html).toContain('<h3>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<ul>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
