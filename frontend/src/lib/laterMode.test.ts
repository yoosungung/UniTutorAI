import { describe, expect, it } from 'vitest';
import { assertValidTutorTurn } from './tutorTurn';
import { coachEditorDraft, linkRoommateTopic } from './laterMode';
import type { SourceSpan } from '../types/sourceSpan';

const spans: SourceSpan[] = [
  {
    id: 'span-fn',
    courseId: 'c',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
  {
    id: 'span-var',
    courseId: 'c',
    concept: 'Variables',
    startSec: 948,
    endSec: 1214,
    slideLabel: 'Variables',
  },
];

describe('coachEditorDraft', () => {
  it('returns null for a blank draft', () => {
    expect(
      coachEditorDraft({
        draft: '   ',
        sourceSpanId: 'span-fn',
        spans,
      }),
    ).toBeNull();
  });

  it('keeps the current scene and one coaching question without a rewrite', () => {
    const draft = [
      'def hello():',
      '    print("hello")',
      '    return 1',
      '    return 2',
    ].join('\n');
    const turn = coachEditorDraft({
      draft,
      sourceSpanId: 'span-fn',
      spans,
      turnId: 'editor-1',
    });
    expect(turn).not.toBeNull();
    assertValidTutorTurn(turn!);
    expect(turn!.id).toBe('editor-1');
    expect(turn!.sourceSpanId).toBe('span-fn');
    expect(turn!.scope).toBe('in_lecture');
    expect(turn!.citations).toEqual(['span-fn']);
    expect(turn!.question).toMatch(/\?|까요/);
    expect(turn!.question).not.toContain(draft);
    expect(turn!.question).not.toMatch(/return 1[\s\S]*return 2/);
    expect(turn).not.toHaveProperty('answer');
    expect(turn).not.toHaveProperty('solution');
  });
});

describe('linkRoommateTopic', () => {
  it('returns null for a blank topic', () => {
    expect(
      linkRoommateTopic({
        message: ' ',
        sourceSpanId: 'span-fn',
        spans,
      }),
    ).toBeNull();
  });

  it('stays in_lecture when the topic names a lecture concept', () => {
    const turn = linkRoommateTopic({
      message: '경제학의 함수와 Functions를 잇고 싶어요',
      sourceSpanId: 'span-fn',
      spans,
      turnId: 'room-1',
    });
    expect(turn).not.toBeNull();
    assertValidTutorTurn(turn!);
    expect(turn!.sourceSpanId).toBe('span-fn');
    expect(turn!.scope).toBe('in_lecture');
    expect(turn!.citations).toEqual(['span-fn']);
    expect(turn!.question).toMatch(/\?|까요/);
  });

  it('uses out_of_scope on the same scene when the topic is outside the lecture', () => {
    const turn = linkRoommateTopic({
      message: '양자중력과 거시경제를 잇고 싶어요',
      sourceSpanId: 'span-fn',
      spans,
      turnId: 'room-oos',
    });
    expect(turn).not.toBeNull();
    assertValidTutorTurn(turn!);
    expect(turn!.sourceSpanId).toBe('span-fn');
    expect(turn!.scope).toBe('out_of_scope');
    expect(turn!.citations).toEqual([]);
    expect(turn!.question).toMatch(/범위 밖/);
    expect(turn!.question).toMatch(/장면|골라|같은 화면/);
  });
});
