import { useState } from 'react';
import {
  clearByokApiKey,
  hasByokApiKey,
  loadByokApiKey,
  maskByokApiKey,
  saveByokApiKey,
} from '../../lib/byok';

type Props = {
  onChanged?: (active: boolean) => void;
};

/**
 * Browser-only Gemini BYOK register/clear. Key never leaves the device except
 * as a one-shot request header.
 */
export function ByokPanel({ onChanged }: Props) {
  const [draft, setDraft] = useState('');
  const [active, setActive] = useState(() => hasByokApiKey());
  const stored = active ? loadByokApiKey() : null;

  function register() {
    if (!saveByokApiKey(draft)) return;
    setDraft('');
    setActive(true);
    onChanged?.(true);
  }

  function clear() {
    clearByokApiKey();
    setActive(false);
    setDraft('');
    onChanged?.(false);
  }

  return (
    <div
      role="region"
      aria-label="BYOK API 키"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '4px 0',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
        내 Gemini API 키를 쓰면 앱 한도 없이도 문답할 수 있어요. 키는 이
        브라우저에만 저장되고, 요청마다 한 번만 전달됩니다.
      </p>
      {active && stored ? (
        <>
          <p style={{ margin: 0, fontSize: 13 }} aria-label="등록된 API 키">
            등록됨: {maskByokApiKey(stored)}
          </p>
          <button type="button" onClick={clear}>
            API 키 해제
          </button>
        </>
      ) : (
        <>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 13,
            }}
          >
            Gemini API 키
            <input
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza…"
            />
          </label>
          <button type="button" onClick={register} disabled={!draft.trim()}>
            API 키 등록
          </button>
        </>
      )}
    </div>
  );
}
