export type LayoutMode = 'stacked' | 'sideBySide';
export type SplitRatio = '7:3' | '5:5' | '3:7';

export const SNAP_RATIOS: SplitRatio[] = ['7:3', '5:5', '3:7'];

/** THEME.md §4.1 — narrow < 768px → stacked; wide ≥ 768px → side-by-side. */
export function layoutModeFromSize(width: number, _height: number): LayoutMode {
  return width < 768 ? 'stacked' : 'sideBySide';
}

const MEDIA_SHARES: Record<SplitRatio, number> = {
  '7:3': 0.7,
  '5:5': 0.5,
  '3:7': 0.3,
};

export function mediaShareForRatio(ratio: SplitRatio): number {
  return MEDIA_SHARES[ratio];
}

export function snapRatioFromMediaShare(mediaShare: number): SplitRatio {
  let best: SplitRatio = '5:5';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ratio of SNAP_RATIOS) {
    const dist = Math.abs(MEDIA_SHARES[ratio] - mediaShare);
    if (dist < bestDist) {
      best = ratio;
      bestDist = dist;
    }
  }
  return best;
}

export function flexForRatio(ratio: SplitRatio): { media: number; tutor: number } {
  switch (ratio) {
    case '7:3':
      return { media: 7, tutor: 3 };
    case '3:7':
      return { media: 3, tutor: 7 };
    case '5:5':
    default:
      return { media: 5, tutor: 5 };
  }
}
