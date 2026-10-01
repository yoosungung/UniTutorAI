import type { ReactNode } from 'react';

/** Tutor pane chrome around a TutorTurn (or placeholder). */
export function TutorPane({
  layoutLabel,
  children,
  footer,
}: {
  layoutLabel: string;
  children?: ReactNode;
  /** Formula / answer entry — defaults to a plain text field. */
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        padding: 16,
        backgroundColor: 'var(--bg-base, #0B0F19)',
        color: 'var(--text-primary, #F8FAFC)',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle, #1E293B)',
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Tutor (소크라테스식 1질문)
        </h2>
        <span style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)' }}>
          {layoutLabel}
        </span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>{children}</div>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle, #1E293B)',
          paddingTop: 8,
        }}
      >
        {footer ?? (
          <input
            type="text"
            placeholder="답변 또는 수식을 입력하세요..."
            aria-label="튜터 답변 입력"
            style={{
              width: '100%',
              padding: 10,
              backgroundColor: 'var(--bg-elevated, #1F2937)',
              border: '1px solid var(--border-subtle, #1E293B)',
              borderRadius: 6,
              color: 'var(--text-primary, #F8FAFC)',
              boxSizing: 'border-box',
            }}
          />
        )}
      </footer>
    </div>
  );
}
