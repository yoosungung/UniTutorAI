import type { PathItem } from '../../types/path';
import type { SourceSpan } from '../../types/sourceSpan';

const PLACEMENT_LABEL: Record<PathItem['placement'], string> = {
  planned: '예정',
  skipped: '건너뜀',
  current: '오늘',
  detour: '우회',
};

export type PathViewProps = {
  path: PathItem[];
  spans: SourceSpan[];
};

function conceptFor(id: string, spans: SourceSpan[]): string {
  return spans.find((s) => s.id === id)?.concept ?? id;
}

/** Vertical path list — PRODUCT §4.2 planned / skipped / current / detour. */
export function PathView({ path, spans }: PathViewProps) {
  return (
    <ol
      aria-label="학습 경로"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {path.map((item, index) => (
        <li
          key={`${item.sourceSpanId}-${item.placement}-${index}`}
          data-placement={item.placement}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 6,
            background:
              item.placement === 'current' || item.placement === 'detour'
                ? 'var(--bg-elevated, #1F2937)'
                : 'transparent',
            color:
              item.placement === 'skipped'
                ? 'var(--text-muted, #64748B)'
                : 'var(--text-primary, #F8FAFC)',
            borderLeft:
              item.placement === 'detour'
                ? '3px solid var(--badge-detour, #F59E0B)'
                : item.placement === 'current'
                  ? '3px solid var(--accent-primary, #3B82F6)'
                  : '3px solid transparent',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary, #94A3B8)',
              minWidth: 48,
            }}
          >
            {PLACEMENT_LABEL[item.placement]}
          </span>
          <span style={{ fontSize: 14, lineHeight: '20px' }}>
            {conceptFor(item.sourceSpanId, spans)}
          </span>
        </li>
      ))}
    </ol>
  );
}
