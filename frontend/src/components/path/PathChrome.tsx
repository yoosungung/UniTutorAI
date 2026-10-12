import { useId, useState, type ReactNode } from 'react';
import type { PathItem } from '../../types/path';
import type { SourceSpan } from '../../types/sourceSpan';
import { PathView } from './PathView';

export type PathChromeProps = {
  path: PathItem[];
  spans: SourceSpan[];
  active?: PathItem;
  onStuck: () => void;
  onDetourDone: () => void;
  onCloseSession: () => void;
  /** Shown only while expanded (PictureSearch, panels, …). */
  children?: ReactNode;
};

function conceptFor(id: string, spans: SourceSpan[]): string {
  return spans.find((s) => s.id === id)?.concept ?? id;
}

/**
 * Gating-strip Path chrome — PRODUCT §4.2 placement preserved;
 * collapsed by default so the study canvas keeps viewport.
 */
export function PathChrome({
  path,
  spans,
  active,
  onStuck,
  onDetourDone,
  onCloseSession,
  children,
}: PathChromeProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const isDetour = active?.placement === 'detour';
  const title = active
    ? conceptFor(active.sourceSpanId, spans)
    : '학습 경로';

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-subtle, #1E293B)',
        padding: '0 12px',
        ...(expanded
          ? { maxHeight: '40vh', overflow: 'auto' }
          : { flexShrink: 0 }),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 40,
          padding: '6px 0',
        }}
      >
        {isDetour && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--badge-detour, #F59E0B)',
              border: '1px solid var(--badge-detour, #F59E0B)',
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            우회
          </span>
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 500,
            color: 'var(--text-primary, #F8FAFC)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <button
          type="button"
          aria-label="학습 경로"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
          style={{
            flexShrink: 0,
            fontSize: 13,
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle, #1E293B)',
            background: 'var(--bg-elevated, #1F2937)',
            color: 'var(--text-secondary, #94A3B8)',
            cursor: 'pointer',
          }}
        >
          경로
        </button>
      </div>
      {expanded && (
        <div id={panelId}>
          {children}
          <PathView path={path} spans={spans} />
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
            {active?.placement === 'current' && (
              <button type="button" onClick={onStuck}>
                막힘 — 우회 삽입
              </button>
            )}
            {active?.placement === 'detour' && (
              <button type="button" onClick={onDetourDone}>
                우회 끝 — 원래 질문으로
              </button>
            )}
            {active?.placement === 'current' && (
              <button type="button" onClick={onCloseSession}>
                세션 종료 — ReviewCard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
