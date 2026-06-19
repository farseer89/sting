import { describe, expect, it } from 'vitest';
import type { ConversationView } from './intake-view.model';
import {
  conversationPriority,
  formatAge,
  formatExpiry,
  renderQuestionForChannel,
  routingBadge,
  sortOpenConversations,
  unconfirmedAiClaimCount,
} from './intake-studio.util';

function conv(overrides: Partial<ConversationView>): ConversationView {
  return {
    id: 'c',
    contactId: 'k',
    contactLabel: 'Contact',
    triggerType: 'journalist',
    blocking: false,
    resumeTarget: { type: 'article', id: 'a', label: 'A' },
    status: 'in_progress',
    currentQuestionIndex: 0,
    questions: [],
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('conversationPriority', () => {
  it('ranks blocking fact_check above everything', () => {
    const fc = conversationPriority({ triggerType: 'fact_check', blocking: true });
    const review = conversationPriority({ triggerType: 'article_review', blocking: false });
    const onboarding = conversationPriority({ triggerType: 'onboarding', blocking: false });
    expect(fc).toBeLessThan(review);
    expect(review).toBeLessThan(onboarding);
  });

  it('gives a blocking conversation a higher priority than its non-blocking peer', () => {
    const blocking = conversationPriority({ triggerType: 'journalist', blocking: true });
    const plain = conversationPriority({ triggerType: 'journalist', blocking: false });
    expect(blocking).toBeLessThan(plain);
  });
});

describe('sortOpenConversations', () => {
  it('puts blocking fact_check first, then by age (oldest first) within priority', () => {
    const now = Date.now();
    const items = [
      conv({ id: 'onboard', triggerType: 'onboarding', createdAt: new Date(now - 1000).toISOString() }),
      conv({ id: 'fc', triggerType: 'fact_check', blocking: true, createdAt: new Date(now - 500).toISOString() }),
      conv({ id: 'journo-new', triggerType: 'journalist', createdAt: new Date(now - 100).toISOString() }),
      conv({ id: 'journo-old', triggerType: 'journalist', createdAt: new Date(now - 9000).toISOString() }),
    ];
    const sorted = sortOpenConversations(items).map((c) => c.id);
    expect(sorted[0]).toBe('fc');
    // journalist sorted oldest-first
    expect(sorted.indexOf('journo-old')).toBeLessThan(sorted.indexOf('journo-new'));
    // onboarding is last
    expect(sorted[sorted.length - 1]).toBe('onboard');
  });

  it('does not mutate the input array', () => {
    const items = [conv({ id: 'a' }), conv({ id: 'b' })];
    const copy = [...items];
    sortOpenConversations(items);
    expect(items).toEqual(copy);
  });
});

describe('formatExpiry', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('renders expired for past timestamps', () => {
    expect(formatExpiry('2025-12-31T23:00:00Z', now)).toBe('expired');
  });

  it('renders minutes under an hour', () => {
    expect(formatExpiry('2026-01-01T00:30:00Z', now)).toBe('30m left');
  });

  it('renders hours under two days', () => {
    expect(formatExpiry('2026-01-01T18:00:00Z', now)).toBe('18h left');
  });

  it('renders days beyond 48 hours', () => {
    expect(formatExpiry('2026-01-04T00:00:00Z', now)).toBe('3d left');
  });

  it('handles invalid input', () => {
    expect(formatExpiry('not-a-date', now)).toBe('unknown');
  });
});

describe('formatAge', () => {
  const now = new Date('2026-01-10T00:00:00Z');

  it('renders just now for sub-minute ages', () => {
    expect(formatAge('2026-01-09T23:59:40Z', now)).toBe('just now');
  });

  it('renders days for old timestamps', () => {
    expect(formatAge('2026-01-07T00:00:00Z', now)).toBe('3d ago');
  });
});

describe('routingBadge', () => {
  it('maps each outcome to a label and tone', () => {
    expect(routingBadge('matched_conversation')).toEqual({ label: 'Matched question', tone: 'good' });
    expect(routingBadge('intake_parsed')).toEqual({ label: 'Parsed as update', tone: 'info' });
    expect(routingBadge('no_match')).toEqual({ label: 'No match', tone: 'warn' });
    expect(routingBadge('error')).toEqual({ label: 'Error', tone: 'error' });
  });
});

describe('renderQuestionForChannel', () => {
  const mc = { text: 'Which job?', answerShape: 'multiple_choice' as const, choices: ['A', 'B', 'C'] };

  it('numbers options and adds a reply hint for SMS', () => {
    const r = renderQuestionForChannel(mc, 'sms');
    expect(r.prompt).toContain('1. A');
    expect(r.prompt).toContain('3. C');
    expect(r.replyHint).toBe('Reply 1, 2, 3');
  });

  it('exposes raw tappable options for in-app', () => {
    const r = renderQuestionForChannel(mc, 'in_app');
    expect(r.options).toEqual(['A', 'B', 'C']);
    expect(r.replyHint).toBe('Tap an option');
    // in-app prompt should not contain the numbered list
    expect(r.prompt).toBe('Which job?');
  });

  it('renders yes/no differently per channel', () => {
    const yn = { text: 'Accurate?', answerShape: 'yes_no' as const };
    expect(renderQuestionForChannel(yn, 'sms').prompt).toContain('Reply Y or N');
    expect(renderQuestionForChannel(yn, 'in_app').options).toEqual(['Yes', 'No']);
  });

  it('handles photo and free-text shapes', () => {
    const photo = { text: 'Send a pic', answerShape: 'photo' as const };
    expect(renderQuestionForChannel(photo, 'sms').replyHint).toBe('Send a photo');
    const free = { text: 'Tell me more', answerShape: 'free_text' as const };
    expect(renderQuestionForChannel(free, 'in_app').options).toEqual([]);
  });
});

describe('unconfirmedAiClaimCount', () => {
  it('counts only pending AI-provenance claims', () => {
    const claims = [
      { provenance: 'ai' as const, status: 'pending' },
      { provenance: 'ai' as const, status: 'answered' },
      { provenance: 'client' as const, status: 'pending' },
      { provenance: 'ai' as const, status: 'pending' },
    ];
    expect(unconfirmedAiClaimCount(claims)).toBe(2);
  });
});
