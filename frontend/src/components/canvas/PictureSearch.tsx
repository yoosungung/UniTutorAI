import { useMemo, useState } from 'react';
import type { CitationSelected } from '../../types/events';
import type { SourceSpan } from '../../types/sourceSpan';
import { resolveCitationSelected } from '../../lib/citationSeek';
import { searchPictureSpans } from '../../lib/pictureSearch';

type Props = {
  spans: SourceSpan[];
  onCitationSelected: (event: CitationSelected) => void;
};

function resultLabel(span: SourceSpan): string {
  return span.slideLabel?.trim() || span.concept;
}

/**
 * Static slideLabel/concept search on the study canvas.
 * Selection reuses CitationSelected → SourceSpan.startSec (no schema change).
 */
export function PictureSearch({ spans, onCitationSelected }: Props) {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => searchPictureSpans(spans, query),
    [spans, query],
  );
  const trimmed = query.trim();

  return (
    <div
      data-picture-search
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '8px 0 12px',
      }}
    >
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontSize: 11,
          lineHeight: '16px',
          fontWeight: 500,
          color: 'var(--text-muted, #64748B)',
        }}
      >
        슬라이드·개념 검색
        <input
          type="search"
          role="searchbox"
          aria-label="슬라이드 또는 개념 검색"
          placeholder="예: Functions, Variables…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: 13,
            lineHeight: '20px',
            backgroundColor: 'var(--bg-elevated, #1F2937)',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: 6,
            color: 'var(--text-primary, #F8FAFC)',
            boxSizing: 'border-box',
          }}
        />
      </label>

      {trimmed && results.length === 0 && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '20px',
            color: 'var(--text-secondary, #94A3B8)',
          }}
        >
          일치하는 슬라이드·개념이 없습니다.
        </p>
      )}

      {results.length > 0 && (
        <ul
          aria-label="검색 결과"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            maxHeight: 96,
            overflowY: 'auto',
          }}
        >
          {results.map((span) => {
            const label = resultLabel(span);
            return (
              <li key={span.id}>
                <button
                  type="button"
                  onClick={() =>
                    onCitationSelected(resolveCitationSelected(span.id, spans))
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
    </div>
  );
}
