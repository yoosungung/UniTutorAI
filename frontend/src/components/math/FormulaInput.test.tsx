import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormulaInput } from './FormulaInput';

describe('FormulaInput', () => {
  it('emits verdict before question text updates in the parent callback order', () => {
    const order: string[] = [];
    const onChecked = vi.fn((verdict: 'correct' | 'incorrect') => {
      order.push(`verdict:${verdict}`);
    });

    render(<FormulaInput expectedExpr="4" onChecked={onChecked} />);

    fireEvent.change(screen.getByLabelText('수식 입력'), {
      target: { value: '2+2' },
    });
    fireEvent.click(screen.getByRole('button', { name: '판정' }));

    expect(order[0]).toBe('verdict:correct');
    expect(onChecked).toHaveBeenCalledWith('correct', '2+2');
  });

  it('shows incorrect status without revealing the expected answer', () => {
    const onChecked = vi.fn();
    render(<FormulaInput expectedExpr="4" onChecked={onChecked} />);

    fireEvent.change(screen.getByLabelText('수식 입력'), {
      target: { value: '2+3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '판정' }));

    expect(onChecked).toHaveBeenCalledWith('incorrect', '2+3');
    expect(screen.getByRole('status')).toHaveAttribute(
      'data-formula-verdict',
      'incorrect',
    );
    expect(screen.queryByText(/정답|풀이|완성된 식/)).toBeNull();
  });
});
