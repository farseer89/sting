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
