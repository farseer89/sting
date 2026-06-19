import { describe, expect, it } from 'vitest';
import type { ProtopipePendingConversation } from '@hive/contracts';
import { conversationToThought } from './conversation-to-thought.util';
import { dtoToConversationView } from './intake-studio.live';

function conv(over: Partial<ProtopipePendingConversation> = {}): ProtopipePendingConversation {
  return {
    id: 'conv1',
    siteId: 'site1',
    contactId: '+18085551234',
    contactLabel: 'Crew lead',
    triggerType: 'fact_check',
    blocking: true,
    resumeTarget: { type: 'claim', id: 'card1', label: 'paints walls' },
    status: 'in_progress',
    currentQuestionIndex: 0,
    questions: [
      {
        index: 0,
        text: 'Do you paint walls?',
        answerShape: 'yes_no',
        channel: 'sms',
        status: 'answered',
        sentAt: '2026-06-18T10:00:00.000Z',
        expiresAt: '2026-06-18T11:00:00.000Z',
        answer: 'yes',
        answeredAt: '2026-06-18T10:05:00.000Z',
      },
    ],
    events: [
      { type: 'triggered', at: '2026-06-18T10:00:00.000Z' },
      { type: 'answer_received', at: '2026-06-18T10:05:00.000Z', questionIndex: 0 },
    ],
    createdAt: '2026-06-18T10:00:00.000Z',
    updatedAt: '2026-06-18T10:05:00.000Z',
    ...over,
  };
}

describe('conversationToThought', () => {
  it('maps each question to a step and answered -> complete', () => {
    const t = conversationToThought(conv());
    expect(t.steps).toHaveLength(1);
    expect(t.steps[0].status).toBe('complete');
    expect(t.steps[0].output?.[0].data).toBe('yes');
    expect(t.thinkerKind).toBe('intake:fact_check');
  });

  it('maps in_progress conversation to running and exposes currentStepId', () => {
    const t = conversationToThought(conv());
    expect(t.status).toBe('running');
    expect(t.currentStepId).toBe('q0');
  });

  it('maps expired/abandoned conversations to failed', () => {
    expect(conversationToThought(conv({ status: 'expired' })).status).toBe('failed');
    expect(conversationToThought(conv({ status: 'abandoned' })).status).toBe('failed');
  });

  it('renders media answers as an image artifact', () => {
    const t = conversationToThought(
      conv({
        questions: [
          {
            index: 0,
            text: 'Send a photo',
            answerShape: 'photo',
            channel: 'sms',
            status: 'answered',
            sentAt: '2026-06-18T10:00:00.000Z',
            expiresAt: '2026-06-18T11:00:00.000Z',
            answer: '[photo]',
            mediaUrls: ['https://x/y.jpg'],
          },
        ],
      }),
    );
    expect(t.steps[0].output?.[0].kind).toBe('image');
    expect(t.steps[0].output?.[0].data).toEqual(['https://x/y.jpg']);
  });

  it('attaches resume result as an output port', () => {
    const t = conversationToThought(conv({ status: 'complete', resumeResult: 'claim_confirmed' }));
    expect(t.status).toBe('complete');
    expect(t.outputs[0].artifact?.data).toBe('claim_confirmed');
    expect(t.finishedAt).toBe('2026-06-18T10:05:00.000Z');
  });
});

describe('dtoToConversationView', () => {
  it('defaults optional label fields the UI treats as required', () => {
    const view = dtoToConversationView(
      conv({ contactLabel: undefined, resumeTarget: { type: 'claim', id: 'c1' } }),
    );
    expect(view.contactLabel).toBe('+18085551234');
    expect(view.resumeTarget.label).toBe('c1');
  });

  it('preserves questions and events', () => {
    const view = dtoToConversationView(conv());
    expect(view.questions[0].answer).toBe('yes');
    expect(view.events).toHaveLength(2);
  });
});
