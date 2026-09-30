import { useState } from 'react';
import { StudyCanvas } from './components/canvas/StudyCanvas';
import { TutorPane } from './components/tutor/TutorPane';
import { TutorTurnView } from './components/tutor/TutorTurnView';
import { CS50P_LECTURE_0, CS50P_LECTURE_0_SPANS } from './data/cs50pLecture0';
import { MOCK_TUTOR_TURN_IN_LECTURE } from './data/mockTutorTurn';
import { useLayoutMode } from './hooks/useLayoutMode';
import type { CitationSelected } from './types/events';

export default function App() {
  const layout = useLayoutMode();
  const [seekSec, setSeekSec] = useState<number | undefined>(undefined);
  const layoutLabel =
    layout === 'stacked'
      ? '모바일 세로 모드 (상하 2분할)'
      : '데스크톱 가로 모드 (좌우 2분할)';

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <StudyCanvas
        course={CS50P_LECTURE_0}
        seekSec={seekSec}
        tutor={
          <TutorPane layoutLabel={layoutLabel}>
            <TutorTurnView
              turn={MOCK_TUTOR_TURN_IN_LECTURE}
              spans={CS50P_LECTURE_0_SPANS}
              onCitationSelected={(e: CitationSelected) =>
                setSeekSec(e.startSec)
              }
            />
          </TutorPane>
        }
      />
    </div>
  );
}
