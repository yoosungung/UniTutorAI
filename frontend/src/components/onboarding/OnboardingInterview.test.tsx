import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingInterview } from './OnboardingInterview';
import type { SourceSpan } from '../../types/sourceSpan';

const spans: SourceSpan[] = [
  {
    id: 'span-a',
    courseId: 'c',
    concept: 'Functions',
    startSec: 0,
    endSec: 10,
  },
  {
    id: 'span-b',
    courseId: 'c',
    concept: 'Variables',
    startSec: 10,
    endSec: 20,
  },
];

describe('OnboardingInterview', () => {
  it('toggles known concepts and confirms', async () => {
    const user = userEvent.setup();
    const onToggleKnown = vi.fn();
    const onConfirm = vi.fn();
    render(
      <OnboardingInterview
        spans={spans}
        knownSpanIds={['span-a']}
        onToggleKnown={onToggleKnown}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByLabelText('Functions')).toBeChecked();
    await user.click(screen.getByLabelText('Variables'));
    expect(onToggleKnown).toHaveBeenCalledWith('span-b');
    await user.click(screen.getByRole('button', { name: /경로 만들기/ }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
