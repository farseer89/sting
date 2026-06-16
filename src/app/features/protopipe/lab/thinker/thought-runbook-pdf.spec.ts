import type { ThoughtArtifact } from './thought.model';
import { artifactToRunbookText, buildRunbookFilename } from './thought-runbook-pdf';

describe('thought-runbook-pdf', () => {
  it('builds a filesystem-safe filename from the thought title', () => {
    const name = buildRunbookFilename(
      {
        id: 'abc123def456',
        thinkerKind: 'writer',
        title: 'Article · emergency plumber austin',
        status: 'complete',
        steps: [],
        inputs: [],
        outputs: [],
      },
      'abc123def456',
    );
    expect(name).toMatch(/^runbook-article-emergency-plumber-austin-def456-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('formats json artifacts as pretty-printed blocks', () => {
    const text = artifactToRunbookText({
      id: 'brief',
      label: 'SEO brief',
      kind: 'json',
      data: { primaryKeyword: { phrase: 'plumber' } },
      summary: 'plumber · 1200 words',
    });
    expect(text).toContain('=== SEO brief (json) ===');
    expect(text).toContain('Summary: plumber · 1200 words');
    expect(text).toContain('"phrase": "plumber"');
  });

  it('formats markdown artifacts as plain text', () => {
    const text = artifactToRunbookText({
      id: 'draft',
      label: 'Draft',
      kind: 'markdown',
      data: '## Intro\n\nHello world',
    });
    expect(text).toContain('## Intro');
    expect(text).toContain('Hello world');
  });
});
