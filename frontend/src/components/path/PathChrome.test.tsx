import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PathChrome } from './PathChrome';
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

describe('PathChrome', () => {
  it('defaults to collapsed: active concept title + path toggle, no full list', () => {
    render(
      <PathChrome
        path={path}
        spans={spans}
        active={path[1]}
        onStuck={() => {}}
        onDetourDone={() => {}}
        onCloseSession={() => {}}
      />,
    );

    expect(screen.getByText('Functions')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: '학습 경로' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('학습 경로 목록')).not.toBeInTheDocument();
    expect(screen.queryByText('Creating Code')).not.toBeInTheDocument();
    expect(screen.queryByText('Bugs')).not.toBeInTheDocument();
  });

  it('expands to show PathView placement list and path actions', async () => {
    const user = userEvent.setup();
    const onStuck = vi.fn();
    render(
      <PathChrome
        path={path}
        spans={spans}
        active={path[1]}
        onStuck={onStuck}
        onDetourDone={() => {}}
        onCloseSession={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: '학습 경로' }));

    const toggle = screen.getByRole('button', { name: '학습 경로' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('학습 경로 목록')).toBeInTheDocument();
    expect(screen.getByText('Creating Code')).toBeInTheDocument();
    expect(screen.getByText('Bugs')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /막힘/ }));
    expect(onStuck).toHaveBeenCalledOnce();
  });

  it('keeps collapsed on detour with clear detour badge and title', () => {
    const withDetour: PathItem[] = [
      {
        sourceSpanId: 's1',
        placement: 'detour',
        returnToSpanId: 's2',
      },
      { sourceSpanId: 's2', placement: 'planned' },
      { sourceSpanId: 's3', placement: 'planned' },
    ];
    render(
      <PathChrome
        path={withDetour}
        spans={spans}
        active={withDetour[0]}
        onStuck={() => {}}
        onDetourDone={() => {}}
        onCloseSession={() => {}}
      />,
    );

    expect(screen.getByText('우회')).toBeInTheDocument();
    expect(screen.getByText('Creating Code')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '학습 경로' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('학습 경로 목록')).not.toBeInTheDocument();
  });

  it('supports keyboard activation on the path toggle', async () => {
    const user = userEvent.setup();
    render(
      <PathChrome
        path={path}
        spans={spans}
        active={path[1]}
        onStuck={() => {}}
        onDetourDone={() => {}}
        onCloseSession={() => {}}
      />,
    );

    const toggle = screen.getByRole('button', { name: '학습 경로' });
    toggle.focus();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ }');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
