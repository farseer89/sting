import { Schema } from 'prosemirror-model';
import { findFactRanges, type FactHighlightItem } from './fact-highlight.extension';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
  },
  marks: {
    bold: {},
  },
});

function fact(claim: string): FactHighlightItem {
  return {
    id: 'f1',
    claim,
    severity: 'critical',
    resolved: false,
  };
}

describe('findFactRanges', () => {
  it('maps claim positions across multiple inline text nodes (bold span)', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('Prices run '),
        schema.text('$800–$1,500', [schema.mark('bold')]),
        schema.text(' for watercolor.'),
      ]),
    ]);

    const ranges = findFactRanges(doc, [fact('$800–$1,500')]);
    expect(ranges).toHaveLength(1);
    const slice = doc.textBetween(ranges[0].from, ranges[0].to);
    expect(slice).toBe('$800–$1,500');
  });

  it('uses claimStart/claimEnd when useOffsets is set', () => {
    const claim = 'live wedding painting';
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('We offer live wedding painting on your day.'),
      ]),
    ]);

    const start = doc.textContent.indexOf(claim);
    const ranges = findFactRanges(doc, [
      {
        id: 'f1',
        claim,
        severity: 'critical',
        resolved: false,
        useOffsets: true,
        claimStart: start,
        claimEnd: start + claim.length,
      },
    ]);
    expect(ranges).toHaveLength(1);
    expect(doc.textBetween(ranges[0].from, ranges[0].to)).toBe(claim);
  });

  it('skips stale facts', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('live wedding painting')]),
    ]);
    expect(findFactRanges(doc, [{ ...fact('live wedding painting'), stale: true }])).toHaveLength(0);
  });

  it('finds claims with normalized dash variants', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('Booking opens 6-12 months out.'),
      ]),
    ]);

    const ranges = findFactRanges(doc, [fact('6–12 months')]);
    expect(ranges.length).toBeGreaterThan(0);
  });
});
