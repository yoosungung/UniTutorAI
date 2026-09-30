import type { CitationSelected } from '../../types/events';
import type { SourceSpan } from '../../types/sourceSpan';
import type { TutorTurn } from '../../types/tutorTurn';
import { resolveCitationSelected } from '../../lib/citationSeek';
import { assertValidTutorTurn } from '../../lib/tutorTurn';

type Props = {
  turn: TutorTurn;
  spans: SourceSpan[];
  onCitationSelected: (event: CitationSelected) => void;
};

function labelForCitation(id: string, spans: SourceSpan[]): string {
  const span = spans.find((s) => s.id === id);
  if (!span) return id;
  return span.slideLabel?.trim() || span.concept;
}

/**
 * Renders one TutorTurn bubble: single question + optional citation seeks.
 * No answer / worked solution (ARCHITECTURE §1, PRODUCT §5).
 */
export function TutorTurnView({ turn, spans, onCitationSelected }: Props) {
  assertValidTutorTurn(turn);

  return (
    <article
      data-tutor-turn={turn.id}
      data-scope={turn.scope}
      data-escalation={turn.escalationStep}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: '26px',
          fontWeight: 600,
          color: 'var(--text-primary, #F8FAFC)',
        }}
      >
        {turn.question}
      </h3>

      {turn.scope === 'out_of_scope' ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '20px',
            color: 'var(--text-secondary, #94A3B8)',
          }}
        >
          추측 설명 없이 범위 밖 안내만 표시합니다.
        </p>
      ) : (
        <ul
          aria-label="강의 인용"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {turn.citations.map((citationId) => {
            const label = labelForCitation(citationId, spans);
            return (
              <li key={citationId}>
                <button
                  type="button"
                  onClick={() =>
                    onCitationSelected(
                      resolveCitationSelected(citationId, spans),
                    )
                  }
                  style={{
                    fontSize: 13,
                    lineHeight: '20px',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-focused, #3B82F6)',
                    backgroundColor: 'var(--bg-elevated, #1F2937)',
                    color: 'var(--text-secondary, #94A3B8)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
