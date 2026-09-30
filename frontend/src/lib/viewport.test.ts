import { describe, expect, it } from 'vitest';
import { layoutModeFromSize, SNAP_RATIOS, snapRatioFromMediaShare } from './viewport';

describe('viewport layout', () => {
  it('uses stacked (portrait) layout below 768px width', () => {
    expect(layoutModeFromSize(375, 812)).toBe('stacked');
    expect(layoutModeFromSize(767, 900)).toBe('stacked');
  });

  it('uses side-by-side (landscape) layout at 768px and above', () => {
    expect(layoutModeFromSize(768, 600)).toBe('sideBySide');
    expect(layoutModeFromSize(1280, 800)).toBe('sideBySide');
  });

  it('snaps media share to nearest 7:3 / 5:5 / 3:7 preset', () => {
    expect(snapRatioFromMediaShare(0.72)).toBe('7:3');
    expect(snapRatioFromMediaShare(0.5)).toBe('5:5');
    expect(snapRatioFromMediaShare(0.28)).toBe('3:7');
    expect(SNAP_RATIOS).toEqual(['7:3', '5:5', '3:7']);
  });
});
