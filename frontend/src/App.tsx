import React, { useState, useEffect } from 'react';

type SplitRatio = '7:3' | '5:5' | '3:7';

export default function App() {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerHeight > window.innerWidth;
  });

  const [ratio, setRatio] = useState<SplitRatio>('5:5');

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 분할 비율 계산 (7:3 -> 미디어 70%, 5:5 -> 50%, 3:7 -> 대화 70%)
  const getPaneFlex = (ratio: SplitRatio) => {
    switch (ratio) {
      case '7:3':
        return { media: 7, tutor: 3 };
      case '3:7':
        return { media: 3, tutor: 7 };
      case '5:5':
      default:
        return { media: 5, tutor: 5 };
    }
  };

  const { media, tutor } = getPaneFlex(ratio);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isPortrait ? 'column' : 'row',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 미디어 뷰포트 (상단 또는 좌측) */}
      <section
        style={{
          flex: media,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          minWidth: 0,
          minHeight: 0,
          transition: 'flex 0.2s ease',
        }}
        aria-label="강의 미디어 플레이어"
      >
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            color: '#94a3b8',
            fontSize: '14px',
          }}
        >
          16:9 YouTube Player (인앱 무저장 임베드)
        </div>
      </section>

      {/* 분할 제어 핸들 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: isPortrait ? '4px 0' : '0 4px',
          backgroundColor: '#334155',
          cursor: isPortrait ? 'row-resize' : 'col-resize',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setRatio('7:3')}
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            backgroundColor: ratio === '7:3' ? '#38bdf8' : '#1e293b',
            color: ratio === '7:3' ? '#0f172a' : '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          7:3
        </button>
        <button
          onClick={() => setRatio('5:5')}
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            backgroundColor: ratio === '5:5' ? '#38bdf8' : '#1e293b',
            color: ratio === '5:5' ? '#0f172a' : '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          5:5
        </button>
        <button
          onClick={() => setRatio('3:7')}
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            backgroundColor: ratio === '3:7' ? '#38bdf8' : '#1e293b',
            color: ratio === '3:7' ? '#0f172a' : '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          3:7
        </button>
      </div>

      {/* 소크라테스 튜터 대화창 뷰포트 (하단 또는 우측) */}
      <section
        style={{
          flex: tutor,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          minWidth: 0,
          minHeight: 0,
          padding: '16px',
          boxSizing: 'border-box',
          transition: 'flex 0.2s ease',
        }}
        aria-label="소크라테스 튜터 대화"
      >
        <header style={{ borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tutor (소크라테스식 1질문)</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {isPortrait ? '모바일 세로 모드 (상하 2분할)' : '데스크톱 가로 모드 (좌우 2분할)'}
          </span>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.5 }}>
            튜터가 강의의 특정 장면(SourceSpan)을 기반으로 한 번에 하나의 유도 질문을 던집니다.
          </p>
        </div>

        <footer style={{ borderTop: '1px solid #334155', paddingTop: '8px' }}>
          <input
            type="text"
            placeholder="답변 또는 수식을 입력하세요..."
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f8fafc',
              boxSizing: 'border-box',
            }}
          />
        </footer>
      </section>
    </div>
  );
}
