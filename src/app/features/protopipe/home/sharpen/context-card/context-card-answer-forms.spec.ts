import type { ProtopipeContextCard } from '@hive/contracts';
import {
  composeAnswerValue,
  effectiveTopic,
  emptyDraftForCard,
  fieldsForCard,
} from './context-card-answer-forms';

function baseCard(overrides: Partial<ProtopipeContextCard> = {}): ProtopipeContextCard {
  return {
    id: 'card-1',
    siteId: 'site-1',
    type: 'question',
    topic: 'other',
    source: { stage: 'keyword_discovery' },
    cardText: 'Sample question?',
    suggestedValue: null,
    priority: 0.5,
    status: 'pending',
    geoSignal: false,
    citationPotential: null,
    answer: { value: null, correctedFrom: null, resolvedAt: null },
    impact: { affectedArticles: [], affectedPasses: [] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('effectiveTopic', () => {
  it('uses card topic when not other', () => {
    expect(effectiveTopic(baseCard({ topic: 'pricing' }))).toBe('pricing');
  });

  it('infers credentials from license in card text', () => {
    expect(
      effectiveTopic(
        baseCard({ topic: 'other', cardText: 'What is your contractor license number?' }),
      ),
    ).toBe('credentials');
  });
});

describe('fieldsForCard', () => {
  it('returns pricing fields for pricing topic', () => {
    const fields = fieldsForCard(baseCard({ topic: 'pricing' }));
    expect(fields.map((f) => f.key)).toEqual(['service', 'lowPrice', 'highPrice', 'note']);
  });

  it('returns claim verdict field when suggested value exists', () => {
    const fields = fieldsForCard(
      baseCard({ type: 'claim', suggestedValue: 'Costs $2,000' }),
    );
    expect(fields.some((f) => f.key === 'verdict')).toBe(true);
  });
});

describe('composeAnswerValue', () => {
  it('composes pricing answer', () => {
    const card = baseCard({ topic: 'pricing' });
    const result = composeAnswerValue(card, {
      service: 'Panel upgrades',
      lowPrice: '1800',
      highPrice: '2800',
      note: '',
    });
    expect(result.value).toBe('Panel upgrades: $1,800–$2,800');
    expect(result.fieldErrors).toEqual({});
  });

  it('composes credentials answer with issuer', () => {
    const card = baseCard({ topic: 'credentials' });
    const result = composeAnswerValue(card, {
      credentialType: 'license',
      identifier: 'C-12345',
      issuer: 'Hawaii DCCA',
    });
    expect(result.value).toBe('Contractor license C-12345 (Hawaii DCCA)');
  });

  it('composes process answer', () => {
    const card = baseCard({ topic: 'process' });
    const result = composeAnswerValue(card, {
      duration: '2–3 days',
      steps: 'We pull permits, install, and schedule inspection.',
    });
    expect(result.value).toBe(
      '2–3 days. We pull permits, install, and schedule inspection.',
    );
  });

  it('composes service area answer', () => {
    const card = baseCard({ topic: 'service_area' });
    const result = composeAnswerValue(card, { areas: 'Kihei, Wailea, and central Maui' });
    expect(result.value).toBe('Kihei, Wailea, and central Maui');
  });

  it('composes regulations answer', () => {
    const card = baseCard({ topic: 'regulations' });
    const result = composeAnswerValue(card, {
      requirement: 'Maui County permit required',
      details: '$180–250 typical',
    });
    expect(result.value).toBe('Maui County permit required. $180–250 typical');
  });

  it('returns field errors when required pricing fields missing', () => {
    const card = baseCard({ topic: 'pricing' });
    const result = composeAnswerValue(card, { service: 'Panel upgrades', lowPrice: '', highPrice: '' });
    expect(result.value).toBeNull();
    expect(result.fieldErrors['lowPrice']).toBeTruthy();
    expect(result.fieldErrors['highPrice']).toBeTruthy();
  });

  it('uses accurate verdict for claims', () => {
    const card = baseCard({
      type: 'claim',
      suggestedValue: 'Panel upgrades cost $2,000–3,500',
    });
    const result = composeAnswerValue(card, { verdict: 'accurate' });
    expect(result.value).toBe('Panel upgrades cost $2,000–3,500');
  });

  it('uses correction for claim correct verdict', () => {
    const card = baseCard({
      type: 'claim',
      suggestedValue: 'Panel upgrades cost $2,000–3,500',
    });
    const result = composeAnswerValue(card, {
      verdict: 'correct',
      correction: 'Panel upgrades cost $1,800–2,800',
    });
    expect(result.value).toBe('Panel upgrades cost $1,800–2,800');
  });

  it('marks not_true claims', () => {
    const card = baseCard({
      type: 'claim',
      suggestedValue: 'We install in one day',
    });
    const result = composeAnswerValue(card, { verdict: 'not_true', alternative: '' });
    expect(result.value).toBe('Not accurate — do not state this.');
  });

  it('emptyDraftForCard seeds claim verdict', () => {
    const card = baseCard({ type: 'claim', suggestedValue: 'Test claim' });
    const draft = emptyDraftForCard(card);
    expect(draft['verdict']).toBe('accurate');
  });
});
