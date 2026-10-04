import { useState, type ReactNode } from 'react';
import type { SourceSpan } from '../../types/sourceSpan';
import type { TutorTurn } from '../../types/tutorTurn';
import {
  coachEditorDraft,
  linkRoommateTopic,
  type LaterMode,
} from '../../lib/laterMode';

type Props = {
  sourceSpanId: string;
  spans: SourceSpan[];
  onTurn: (turn: TutorTurn) => void;
  tutor: ReactNode;
  onModeChange?: (mode: LaterMode) => void;
};

export function LaterModePane({
  sourceSpanId,
  spans,
  onTurn,
  tutor,
  onModeChange,
}: Props) {
  const [mode, setMode] = useState<LaterMode>('tutor');
  const [draft, setDraft] = useState('');
  const [topic, setTopic] = useState('');

  function selectMode(next: LaterMode) {
    setMode(next);
    onModeChange?.(next);
  }

  return (
    <div>
      <div role="tablist" aria-label="대화 모드" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['tutor', 'editor', 'roommate'] as const).map((key) => {
          const label = key === 'tutor' ? 'Tutor' : key === 'editor' ? 'Editor' : 'Roommate';
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => selectMode(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {mode === 'editor' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const turn = coachEditorDraft({ draft, sourceSpanId, spans });
            if (turn) onTurn(turn);
          }}
        >
          <label>
            글·코드 초안
            <textarea
              aria-label="글·코드 초안"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              style={{ width: '100%', display: 'block' }}
            />
          </label>
          <button type="submit">첨삭 질문</button>
        </form>
      ) : null}

      {mode === 'roommate' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const turn = linkRoommateTopic({
              message: topic,
              sourceSpanId,
              spans,
            });
            if (turn) onTurn(turn);
          }}
        >
          <label>
            다른 분야
            <input
              type="text"
              aria-label="다른 분야"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: '100%', display: 'block' }}
            />
          </label>
          <button type="submit">잇기</button>
        </form>
      ) : null}

      {tutor}
    </div>
  );
}
