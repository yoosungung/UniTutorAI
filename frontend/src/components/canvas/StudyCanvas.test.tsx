import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { StudyCanvas } from './StudyCanvas';
import type { CourseRef } from '../../types/course';

const course: CourseRef = {
  id: 'cs50p-2022-lecture-0',
  title: 'CS50P Lecture 0 — Functions, Variables',
  subject: 'Computer Science',
  playbackUrl: 'https://www.youtube.com/watch?v=JP7ITIXGpHk',
};

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

describe('StudyCanvas', () => {
  beforeEach(() => {
    setViewport(1280, 800);
  });

  afterEach(() => {
    setViewport(1280, 800);
  });

  it('embeds YouTube iframe from CourseRef.playbackUrl', () => {
    render(
      <StudyCanvas
        course={course}
        tutor={<div>tutor-pane</div>}
      />,
    );

    const iframe = screen.getByTitle(/CS50P Lecture 0/i) as HTMLIFrameElement;
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.src).toContain('youtube-nocookie.com/embed/JP7ITIXGpHk');
  });

  it('stacks panes on narrow viewports and sides on wide', () => {
    const { container } = render(
      <StudyCanvas course={course} tutor={<div>tutor-pane</div>} />,
    );

    expect(container.querySelector('[data-layout]')?.getAttribute('data-layout')).toBe(
      'sideBySide',
    );

    act(() => {
      setViewport(390, 844);
    });
    expect(container.querySelector('[data-layout]')?.getAttribute('data-layout')).toBe(
      'stacked',
    );
  });

  it('keeps tutor pane as sibling (does not overlay player)', () => {
    const { container } = render(
      <StudyCanvas course={course} tutor={<div data-testid="tutor">tutor</div>} />,
    );

    const media = container.querySelector('[data-pane="media"]');
    const tutor = container.querySelector('[data-pane="tutor"]');
    expect(media).toBeTruthy();
    expect(tutor).toBeTruthy();
    expect(media?.contains(tutor as Node)).toBe(false);
    expect(screen.getByTestId('tutor')).toBeInTheDocument();
  });

  it('snaps split ratio via handle presets 7:3 / 5:5 / 3:7', () => {
    const { container } = render(
      <StudyCanvas course={course} tutor={<div>tutor</div>} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '7:3' }));
    expect(container.querySelector('[data-ratio]')?.getAttribute('data-ratio')).toBe(
      '7:3',
    );

    fireEvent.click(screen.getByRole('button', { name: '3:7' }));
    expect(container.querySelector('[data-ratio]')?.getAttribute('data-ratio')).toBe(
      '3:7',
    );
  });
});
