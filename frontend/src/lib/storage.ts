import type { PathItem } from '../types/path';

/** Bump when LearnerState shape changes incompatibly. */
export const LEARNER_STATE_VERSION = 1 as const;

export type WrongAnswerRecord = {
  sourceSpanId: string;
  /** ISO-8601 timestamp when the wrong/stuck attempt was recorded. */
  recordedAt: string;
};

/** Local-first learner progress + wrong answers for one CourseRef.id. */
export type LearnerState = {
  version: typeof LEARNER_STATE_VERSION;
  courseId: string;
  path: PathItem[] | null;
  knownSpanIds: string[];
  returnQuestionSpanId: string | null;
  wrongAnswers: WrongAnswerRecord[];
};

/** Storage key scoped by CourseRef.id (ticket risk). */
export function learnerStorageKey(courseId: string): string {
  return `unitutor:learner:${courseId}`;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* quota/private — ignore */
  }
}

function isPathItem(value: unknown): value is PathItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sourceSpanId === 'string' &&
    (v.placement === 'planned' ||
      v.placement === 'skipped' ||
      v.placement === 'current' ||
      v.placement === 'detour') &&
    (v.returnToSpanId === undefined || typeof v.returnToSpanId === 'string')
  );
}

function parseLearnerState(
  courseId: string,
  raw: string,
): LearnerState | null {
  try {
    const data = JSON.parse(raw) as Partial<LearnerState>;
    if (data.version !== LEARNER_STATE_VERSION) return null;
    if (data.courseId !== courseId) return null;
    if (data.path !== null && data.path !== undefined) {
      if (!Array.isArray(data.path) || !data.path.every(isPathItem)) {
        return null;
      }
    }
    if (!Array.isArray(data.knownSpanIds)) return null;
    if (!data.knownSpanIds.every((id) => typeof id === 'string')) return null;
    if (
      data.returnQuestionSpanId !== null &&
      data.returnQuestionSpanId !== undefined &&
      typeof data.returnQuestionSpanId !== 'string'
    ) {
      return null;
    }
    if (!Array.isArray(data.wrongAnswers)) return null;
    for (const w of data.wrongAnswers) {
      if (
        !w ||
        typeof w !== 'object' ||
        typeof (w as WrongAnswerRecord).sourceSpanId !== 'string' ||
        typeof (w as WrongAnswerRecord).recordedAt !== 'string'
      ) {
        return null;
      }
    }
    return {
      version: LEARNER_STATE_VERSION,
      courseId,
      path: data.path ?? null,
      knownSpanIds: data.knownSpanIds,
      returnQuestionSpanId: data.returnQuestionSpanId ?? null,
      wrongAnswers: data.wrongAnswers as WrongAnswerRecord[],
    };
  } catch {
    return null;
  }
}

export function loadLearnerState(courseId: string): LearnerState | null {
  const raw = readRaw(learnerStorageKey(courseId));
  if (!raw) return null;
  return parseLearnerState(courseId, raw);
}

export function saveLearnerState(state: LearnerState): boolean {
  if (state.version !== LEARNER_STATE_VERSION) return false;
  return writeRaw(learnerStorageKey(state.courseId), JSON.stringify(state));
}

export function clearLearnerState(courseId: string): void {
  removeRaw(learnerStorageKey(courseId));
}

export function appendWrongAnswer(
  state: LearnerState,
  sourceSpanId: string,
  recordedAt: string,
): LearnerState {
  return {
    ...state,
    wrongAnswers: [...state.wrongAnswers, { sourceSpanId, recordedAt }],
  };
}
