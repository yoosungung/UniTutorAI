import { StudyCanvas } from './components/canvas/StudyCanvas';
import { TutorPane } from './components/tutor/TutorPane';
import { CS50P_LECTURE_0 } from './data/cs50pLecture0';
import { useLayoutMode } from './hooks/useLayoutMode';

export default function App() {
  const layout = useLayoutMode();
  const layoutLabel =
    layout === 'stacked'
      ? '모바일 세로 모드 (상하 2분할)'
      : '데스크톱 가로 모드 (좌우 2분할)';

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <StudyCanvas
        course={CS50P_LECTURE_0}
        tutor={<TutorPane layoutLabel={layoutLabel} />}
      />
    </div>
  );
}
