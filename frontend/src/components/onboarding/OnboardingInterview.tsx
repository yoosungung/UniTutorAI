import type { SourceSpan } from '../../types/sourceSpan';

export type OnboardingInterviewProps = {
  spans: SourceSpan[];
  knownSpanIds: string[];
  onToggleKnown: (spanId: string) => void;
  onConfirm: () => void;
};

/** Minimal onboarding: mark known concepts → shrink path (PRODUCT §4.4). */
export function OnboardingInterview({
  spans,
  knownSpanIds,
  onToggleKnown,
  onConfirm,
}: OnboardingInterviewProps) {
  const known = new Set(knownSpanIds);
  return (
    <section aria-label="온보딩" style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>지금 어디까지 아시나요?</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary, #94A3B8)', margin: '0 0 12px' }}>
        아는 개념을 고르면 경로에서 건너뛰고, 나머지로 오늘 경로를 만듭니다.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {spans.map((span) => (
          <li key={span.id}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={known.has(span.id)}
                onChange={() => onToggleKnown(span.id)}
              />
              {span.concept}
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onConfirm}
        style={{
          marginTop: 16,
          padding: '8px 14px',
          borderRadius: 6,
          border: 'none',
          background: 'var(--accent-primary, #3B82F6)',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        경로 만들기
      </button>
    </section>
  );
}
