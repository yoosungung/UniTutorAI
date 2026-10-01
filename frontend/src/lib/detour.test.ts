import { describe, expect, it } from 'vitest';
import {
  completeDetour,
  insertDetour,
  pickPrerequisiteDetour,
} from './detour';
import type { KnowledgeDag, PathItem } from '../types/path';

const dag: KnowledgeDag = {
  courseId: 'course-a',
  nodes: ['span-a', 'span-b', 'span-c'],
  edges: [
    { from: 'span-a', to: 'span-b' },
    { from: 'span-b', to: 'span-c' },
  ],
};

const basePath: PathItem[] = [
  { sourceSpanId: 'span-a', placement: 'skipped' },
  { sourceSpanId: 'span-b', placement: 'current' },
  { sourceSpanId: 'span-c', placement: 'planned' },
];

describe('insertDetour', () => {
  it('inserts placement=detour with returnToSpanId and emits DetourInserted', () => {
    const { path, event } = insertDetour({
      path: basePath,
      stuckSpanId: 'span-b',
      detourSpanId: 'span-a',
    });

    expect(event).toEqual({
      type: 'DetourInserted',
      detourSpanId: 'span-a',
      returnToSpanId: 'span-b',
    });

    expect(path).toEqual([
      { sourceSpanId: 'span-a', placement: 'skipped' },
      {
        sourceSpanId: 'span-a',
        placement: 'detour',
        returnToSpanId: 'span-b',
      },
      { sourceSpanId: 'span-b', placement: 'planned' },
      { sourceSpanId: 'span-c', placement: 'planned' },
    ]);
    expect(path.filter((p) => p.placement === 'current')).toHaveLength(0);
    expect(path.find((p) => p.placement === 'detour')?.returnToSpanId).toBe(
      'span-b',
    );
  });

  it('requires the stuck span to be current', () => {
    expect(() =>
      insertDetour({
        path: basePath,
        stuckSpanId: 'span-c',
        detourSpanId: 'span-a',
      }),
    ).toThrow(/current/i);
  });
});

describe('completeDetour', () => {
  it('returns to the original span as current after detour ends', () => {
    const { path: withDetour } = insertDetour({
      path: basePath,
      stuckSpanId: 'span-b',
      detourSpanId: 'span-a',
    });

    const restored = completeDetour(withDetour);

    expect(restored.find((p) => p.placement === 'detour')).toBeUndefined();
    expect(restored.find((p) => p.placement === 'current')).toEqual({
      sourceSpanId: 'span-b',
      placement: 'current',
    });
    // Same canvas resume: original question span is current again (no navigation).
    expect(restored.map((p) => p.sourceSpanId)).toEqual([
      'span-a',
      'span-b',
      'span-c',
    ]);
  });
});

describe('pickPrerequisiteDetour', () => {
  it('picks a DAG prerequisite of the stuck span', () => {
    expect(pickPrerequisiteDetour(dag, 'span-c')).toBe('span-b');
    expect(pickPrerequisiteDetour(dag, 'span-b')).toBe('span-a');
  });

  it('returns null when stuck has no prerequisite', () => {
    expect(pickPrerequisiteDetour(dag, 'span-a')).toBeNull();
  });
});
