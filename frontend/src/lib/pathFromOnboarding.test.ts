import { describe, expect, it } from 'vitest';
import { buildPathFromOnboarding } from './pathFromOnboarding';
import type { KnowledgeDag } from '../types/path';

const dag: KnowledgeDag = {
  courseId: 'course-a',
  nodes: ['span-a', 'span-b', 'span-c', 'span-d'],
  edges: [
    { from: 'span-a', to: 'span-b' },
    { from: 'span-b', to: 'span-c' },
    { from: 'span-c', to: 'span-d' },
  ],
};

describe('buildPathFromOnboarding', () => {
  it('marks known spans skipped and first unknown current; rest planned', () => {
    const path = buildPathFromOnboarding({
      dag,
      knownSpanIds: ['span-a', 'span-b'],
    });

    expect(path).toEqual([
      { sourceSpanId: 'span-a', placement: 'skipped' },
      { sourceSpanId: 'span-b', placement: 'skipped' },
      { sourceSpanId: 'span-c', placement: 'current' },
      { sourceSpanId: 'span-d', placement: 'planned' },
    ]);
  });

  it('starts at first node when nothing is known', () => {
    const path = buildPathFromOnboarding({ dag, knownSpanIds: [] });
    expect(path[0]).toEqual({ sourceSpanId: 'span-a', placement: 'current' });
    expect(path.slice(1).every((p) => p.placement === 'planned')).toBe(true);
  });

  it('rejects known ids outside the DAG', () => {
    expect(() =>
      buildPathFromOnboarding({ dag, knownSpanIds: ['missing'] }),
    ).toThrow(/known|DAG/i);
  });
});
