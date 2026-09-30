import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { CourseRef } from '../../types/course';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import {
  SNAP_RATIOS,
  flexForRatio,
  snapRatioFromMediaShare,
  type SplitRatio,
} from '../../lib/viewport';
import { YouTubePlayer } from '../player/YouTubePlayer';

type Props = {
  course: CourseRef;
  tutor: ReactNode;
  /** CitationSelected → SourceSpan.startSec for player seek. */
  seekSec?: number;
};

/**
 * Adaptive two-pane study canvas (PRODUCT §4.3).
 * Media and tutor are sibling panes — tutor never overlays the player.
 */
export function StudyCanvas({ course, tutor, seekSec }: Props) {
  const layout = useLayoutMode();
  const [ratio, setRatio] = useState<SplitRatio>('5:5');
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const { media, tutor: tutorFlex } = flexForRatio(ratio);
  const stacked = layout === 'stacked';

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = rootRef.current;
      if (!el || !dragging.current) return;
      const rect = el.getBoundingClientRect();
      const share = stacked
        ? (clientY - rect.top) / rect.height
        : (clientX - rect.left) / rect.width;
      if (!Number.isFinite(share)) return;
      setRatio(snapRatioFromMediaShare(Math.min(1, Math.max(0, share))));
    },
    [stacked],
  );

  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={rootRef}
      data-layout={layout}
      data-ratio={ratio}
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-base, #0B0F19)',
        color: 'var(--text-primary, #F8FAFC)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <section
        data-pane="media"
        aria-label="강의 미디어 플레이어"
        style={{
          flex: media,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <YouTubePlayer course={course} seekSec={seekSec} />
      </section>

      <div
        role="separator"
        aria-orientation={stacked ? 'horizontal' : 'vertical'}
        aria-label="분할 비율"
        style={{
          display: 'flex',
          flexDirection: stacked ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: stacked ? '4px 8px' : '8px 4px',
          backgroundColor: 'var(--bg-elevated, #1F2937)',
          borderColor: 'var(--border-subtle, #1E293B)',
          cursor: stacked ? 'row-resize' : 'col-resize',
          userSelect: 'none',
          flexShrink: 0,
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          onPointerMove(e.clientX, e.clientY);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span
          aria-hidden
          style={{
            width: stacked ? 28 : 4,
            height: stacked ? 4 : 28,
            borderRadius: 2,
            backgroundColor: 'var(--text-muted, #64748B)',
          }}
        />
        {SNAP_RATIOS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={ratio === preset}
            onClick={() => setRatio(preset)}
            style={{
              fontSize: 11,
              padding: '4px 6px',
              minWidth: 36,
              minHeight: 28,
              backgroundColor:
                ratio === preset
                  ? 'var(--accent-primary, #3B82F6)'
                  : 'var(--bg-surface, #111827)',
              color:
                ratio === preset
                  ? '#fff'
                  : 'var(--text-primary, #F8FAFC)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      <section
        data-pane="tutor"
        aria-label="소크라테스 튜터 대화"
        style={{
          flex: tutorFlex,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          backgroundColor: 'var(--bg-surface, #111827)',
          overflow: 'hidden',
        }}
      >
        {tutor}
      </section>
    </div>
  );
}
