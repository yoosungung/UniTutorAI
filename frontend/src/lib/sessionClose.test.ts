import { describe, expect, it } from 'vitest';
import type { ReviewCard } from '../types/reviewCard';
import type { PathItem } from '../types/path';
import {
  LEARNER_STATE_VERSION,
  appendReviewCard,
  clearLearnerState,
  loadLearnerState,
  saveLearnerState,
  type LearnerState,
} from './storage';
import { closeSession } from './sessionClose';

const courseId = 'cs50p-lecture-0';

const path: PathItem[] = [
  { sourceSpanId: 'span-a', placement: 'skipped' },
  { sourceSpanId: 'span-b', placement: 'current' },
];

function sampleState(
  overrides: Partial<LearnerState> = {},
): LearnerState {
  return {
    version: LEARNER_STATE_VERSION,
    courseId,
    path,
    knownSpanIds: [],
    returnQuestionSpanId: null,
    wrongAnswers: [],
    reviewCards: [],
    ...overrides,
  };
}

describe('closeSession', () => {
  it('emits SessionClosed and appends one ReviewCard to learner state', () => {
    const state = sampleState();
    const closedAt = '2026-10-01T12:00:00.000Z';

    const { event, state: next, card } = closeSession({
      state,
      sourceSpanId: 'span-b',
      summary: '오늘의 확인을 마쳤습니다.',
      closedAt,
      cardId: 'review-span-b',
    });

    expect(event).toEqual({
      type: 'SessionClosed',
      sourceSpanId: 'span-b',
      summary: '오늘의 확인을 마쳤습니다.',
      closedAt,
    });
    expect(card.id).toBe('review-span-b');
    expect(card.sourceSpanId).toBe('span-b');
    expect(card.summary).toBe('오늘의 확인을 마쳤습니다.');
    expect(card.createdAt).toBe(closedAt);
    expect(Date.parse(card.fadesAt)).toBeGreaterThan(Date.parse(closedAt));
    expect(next.reviewCards).toHaveLength(1);
    expect(next.reviewCards[0]).toEqual(card);
    expect(state.reviewCards).toHaveLength(0);
  });
});

describe('LearnerState reviewCards persistence', () => {
  it('persists ReviewCard on the shared learner storage key', () => {
    const card: ReviewCard = {
      id: 'review-1',
      sourceSpanId: 'span-b',
      summary: '요약',
      createdAt: '2026-10-01T12:00:00.000Z',
      fadesAt: '2026-10-04T12:00:00.000Z',
    };
    const state = appendReviewCard(sampleState(), card);
    expect(saveLearnerState(state)).toBe(true);
    const loaded = loadLearnerState(courseId);
    expect(loaded?.reviewCards).toEqual([card]);
    clearLearnerState(courseId);
  });
});
