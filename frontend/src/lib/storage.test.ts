import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PathItem } from '../types/path';
import {
  LEARNER_STATE_VERSION,
  appendWrongAnswer,
  clearLearnerState,
  learnerStorageKey,
  loadLearnerState,
  saveLearnerState,
  type LearnerState,
  type WrongAnswerRecord,
} from './storage';

const courseId = 'cs50p-lecture-0';

const samplePath: PathItem[] = [
  { sourceSpanId: 'span-a', placement: 'skipped' },
  { sourceSpanId: 'span-b', placement: 'current' },
  { sourceSpanId: 'span-c', placement: 'planned' },
];

function sampleState(
  overrides: Partial<LearnerState> = {},
): LearnerState {
  return {
    version: LEARNER_STATE_VERSION,
    courseId,
    path: samplePath,
    knownSpanIds: ['span-a'],
    returnQuestionSpanId: null,
    wrongAnswers: [],
    ...overrides,
  };
}

afterEach(() => {
  clearLearnerState(courseId);
  vi.unstubAllGlobals();
});

describe('learnerStorageKey', () => {
  it('scopes by CourseRef.id', () => {
    expect(learnerStorageKey(courseId)).toBe(
      `unitutor:learner:${courseId}`,
    );
  });
});

describe('saveLearnerState / loadLearnerState', () => {
  it('persists path (current) and wrong answers for a course', () => {
    const wrong: WrongAnswerRecord = {
      sourceSpanId: 'span-b',
      recordedAt: '2026-10-01T12:00:00.000Z',
    };
    const state = sampleState({ wrongAnswers: [wrong] });
    expect(saveLearnerState(state)).toBe(true);

    const loaded = loadLearnerState(courseId);
    expect(loaded).toEqual(state);
    expect(loaded?.path?.find((p) => p.placement === 'current')).toEqual({
      sourceSpanId: 'span-b',
      placement: 'current',
    });
  });

  it('returns null when nothing stored', () => {
    expect(loadLearnerState(courseId)).toBeNull();
  });

  it('rejects mismatched courseId in payload', () => {
    saveLearnerState(sampleState());
    const raw = localStorage.getItem(learnerStorageKey(courseId));
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as LearnerState;
    parsed.courseId = 'other-course';
    localStorage.setItem(learnerStorageKey(courseId), JSON.stringify(parsed));
    expect(loadLearnerState(courseId)).toBeNull();
  });

  it('gracefully degrades when localStorage throws (quota/private)', () => {
    const boom = () => {
      throw new DOMException('QuotaExceededError');
    };
    vi.stubGlobal('localStorage', {
      getItem: boom,
      setItem: boom,
      removeItem: boom,
    });
    expect(saveLearnerState(sampleState())).toBe(false);
    expect(loadLearnerState(courseId)).toBeNull();
  });
});

describe('appendWrongAnswer', () => {
  it('appends a wrong-answer record without mutating prior list', () => {
    const prev = sampleState();
    const next = appendWrongAnswer(prev, 'span-b', '2026-10-01T12:00:00.000Z');
    expect(prev.wrongAnswers).toHaveLength(0);
    expect(next.wrongAnswers).toEqual([
      {
        sourceSpanId: 'span-b',
        recordedAt: '2026-10-01T12:00:00.000Z',
      },
    ]);
  });
});
