import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PictureSearch } from './PictureSearch';
import type { SourceSpan } from '../../types/sourceSpan';
import type { CitationSelected } from '../../types/events';

const spans: SourceSpan[] = [
  {
    id: 'span-a',
    courseId: 'c',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
  {
    id: 'span-b',
    courseId: 'c',
    concept: 'Bugs',
    startSec: 468,
    endSec: 766,
    slideLabel: 'Bugs',
  },
];

describe('PictureSearch', () => {
  it('lists matching slideLabel/concept and emits CitationSelected on select', () => {
    const onCitationSelected = vi.fn<(e: CitationSelected) => void>();
    render(
      <PictureSearch spans={spans} onCitationSelected={onCitationSelected} />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: /슬라이드|개념/i }), {
      target: { value: 'func' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Functions/i }));

    expect(onCitationSelected).toHaveBeenCalledWith({
      type: 'CitationSelected',
      sourceSpanId: 'span-a',
      startSec: 341,
    });
  });

  it('shows empty hint when query has no matches', () => {
    render(<PictureSearch spans={spans} onCitationSelected={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /슬라이드|개념/i }), {
      target: { value: 'zzzz' },
    });

    expect(screen.getByRole('status')).toHaveTextContent(/없/);
  });
});
