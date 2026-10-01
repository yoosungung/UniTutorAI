import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PathView } from './PathView';
import type { PathItem } from '../../types/path';
import type { SourceSpan } from '../../types/sourceSpan';

const spans: SourceSpan[] = [
  {
    id: 's1',
    courseId: 'c',
    concept: 'Creating Code',
    startSec: 0,
    endSec: 10,
  },
  {
    id: 's2',
    courseId: 'c',
    concept: 'Functions',
    startSec: 10,
    endSec: 20,
  },
  {
    id: 's3',
    courseId: 'c',
    concept: 'Bugs',
    startSec: 20,
    endSec: 30,
  },
];

const path: PathItem[] = [
  { sourceSpanId: 's1', placement: 'skipped' },
  { sourceSpanId: 's2', placement: 'current' },
  { sourceSpanId: 's3', placement: 'planned' },
];

describe('PathView', () => {
  it('shows planned / skipped / current labels for path items', () => {
    render(<PathView path={path} spans={spans} />);

    expect(screen.getByText(/Creating Code/).closest('li')).toHaveAttribute(
      'data-placement',
      'skipped',
    );
    expect(screen.getByText(/Functions/).closest('li')).toHaveAttribute(
      'data-placement',
      'current',
    );
    expect(screen.getByText(/Bugs/).closest('li')).toHaveAttribute(
      'data-placement',
      'planned',
    );
  });

  it('shows detour item as detour', () => {
    const withDetour: PathItem[] = [
      {
        sourceSpanId: 's1',
        placement: 'detour',
        returnToSpanId: 's2',
      },
      { sourceSpanId: 's2', placement: 'planned' },
      { sourceSpanId: 's3', placement: 'planned' },
    ];
    render(<PathView path={withDetour} spans={spans} />);
    expect(screen.getByText(/Creating Code/).closest('li')).toHaveAttribute(
      'data-placement',
      'detour',
    );
  });
});
