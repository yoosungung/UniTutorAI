import { useEffect, useMemo, useState } from 'react';
import { StudyCanvas } from './components/canvas/StudyCanvas';
import { OnboardingInterview } from './components/onboarding/OnboardingInterview';
import { PathView } from './components/path/PathView';
import { FormulaInput } from './components/math/FormulaInput';
import { QuotaGate } from './components/tutor/QuotaGate';
import { TutorPane } from './components/tutor/TutorPane';
import { TutorTurnView } from './components/tutor/TutorTurnView';
import {
  CS50P_LECTURE_0,
  CS50P_LECTURE_0_DAG,
  CS50P_LECTURE_0_SPANS,
} from './data/cs50pLecture0';
import { activePathItem } from './lib/activePathItem';
import {
  completeDetour,
  insertDetour,
  pickPrerequisiteDetour,
} from './lib/detour';
import { applyFormulaVerdict } from './lib/mathCheck';
import { buildPathFromOnboarding } from './lib/pathFromOnboarding';
import { closeSession } from './lib/sessionClose';
import {
  ensureReviewServiceWorker,
  processCardFadedNotifications,
  requestReviewNotifyPermission,
  showReviewNotification,
} from './lib/reviewNotify';
import {
  LEARNER_STATE_VERSION,
  loadLearnerState,
  saveLearnerState,
  type WrongAnswerRecord,
} from './lib/storage';
import {
  loadEntitlement,
  setPaidUnlock,
  tryConsumeTutorTurn,
  type TutorEntitlement,
} from './lib/tutorQuota';
import { useLayoutMode } from './hooks/useLayoutMode';
import type { CitationSelected } from './types/events';
import type { PathItem } from './types/path';
import type { ReviewCard } from './types/reviewCard';
import type { TutorTurn } from './types/tutorTurn';

/** Demo expected expression for client formulaVerdict (T3-02). */
const DEMO_EXPECTED_EXPR = '4';

function turnForSpan(spanId: string): TutorTurn {
  const span = CS50P_LECTURE_0_SPANS.find((s) => s.id === spanId);
  const concept = span?.concept ?? spanId;
  return {
    id: `turn-${spanId}`,
    sourceSpanId: spanId,
    question: `${concept} 장면에서, 핵심을 한 문장으로 말해 볼까요?`,
    escalationStep: 1,
    citations: [spanId],
    scope: 'in_lecture',
  };
}

function initialFromStorage() {
  const saved = loadLearnerState(CS50P_LECTURE_0.id);
  return {
    knownSpanIds: saved?.knownSpanIds ?? [],
    path: saved?.path ?? null,
    returnQuestionSpanId: saved?.returnQuestionSpanId ?? null,
    wrongAnswers: saved?.wrongAnswers ?? [],
    reviewCards: saved?.reviewCards ?? [],
  };
}

export default function App() {
  const layout = useLayoutMode();
  const [seekSec, setSeekSec] = useState<number | undefined>(undefined);
  const hydrated = useMemo(() => initialFromStorage(), []);
  const [knownSpanIds, setKnownSpanIds] = useState<string[]>(
    () => hydrated.knownSpanIds,
  );
  const [path, setPath] = useState<PathItem[] | null>(() => hydrated.path);
  const [returnQuestionSpanId, setReturnQuestionSpanId] = useState<
    string | null
  >(() => hydrated.returnQuestionSpanId);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerRecord[]>(
    () => hydrated.wrongAnswers,
  );
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>(
    () => hydrated.reviewCards,
  );
  const [lastClosedSummary, setLastClosedSummary] = useState<string | null>(
    null,
  );
  const [formulaTurn, setFormulaTurn] = useState<TutorTurn | null>(null);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>(
    () =>
      typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [entitlement, setEntitlement] = useState<TutorEntitlement>(() =>
    loadEntitlement(),
  );
  const [tutorAllowed, setTutorAllowed] = useState(true);

  useEffect(() => {
    saveLearnerState({
      version: LEARNER_STATE_VERSION,
      courseId: CS50P_LECTURE_0.id,
      path,
      knownSpanIds,
      returnQuestionSpanId,
      wrongAnswers,
      reviewCards,
    });
  }, [path, knownSpanIds, returnQuestionSpanId, wrongAnswers, reviewCards]);

  useEffect(() => {
    void ensureReviewServiceWorker();
  }, []);

  useEffect(() => {
    if (notifyPermission !== 'granted' || reviewCards.length === 0) return;

    let cancelled = false;

    async function run() {
      const result = await processCardFadedNotifications({
        cards: reviewCards,
        spans: CS50P_LECTURE_0_SPANS,
        now: new Date(),
        permission: notifyPermission,
        showNotification: showReviewNotification,
      });
      if (cancelled || result.events.length === 0) return;
    }

    void run();
    const id = window.setInterval(() => {
      void run();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [notifyPermission, reviewCards]);

  const layoutLabel =
    layout === 'stacked'
      ? '모바일 세로 모드 (상하 2분할)'
      : '데스크톱 가로 모드 (좌우 2분할)';

  const active = path ? activePathItem(path) : undefined;
  const focusSpanId = active?.sourceSpanId;
  const questionSpanId =
    active?.placement === 'detour'
      ? active.sourceSpanId
      : (returnQuestionSpanId ?? focusSpanId);

  const baseTurn = useMemo(
    () => (questionSpanId ? turnForSpan(questionSpanId) : null),
    [questionSpanId],
  );

  useEffect(() => {
    setFormulaTurn(null);
  }, [questionSpanId]);

  const turn = formulaTurn ?? baseTurn;

  useEffect(() => {
    if (!turn) {
      setTutorAllowed(true);
      return;
    }
    const result = tryConsumeTutorTurn(turn.id, new Date(), entitlement);
    setTutorAllowed(result.allowed);
  }, [turn?.id, entitlement.plan]);

  function toggleKnown(spanId: string) {
    setKnownSpanIds((prev) =>
      prev.includes(spanId)
        ? prev.filter((id) => id !== spanId)
        : [...prev, spanId],
    );
  }

  function confirmOnboarding() {
    setPath(
      buildPathFromOnboarding({
        dag: CS50P_LECTURE_0_DAG,
        knownSpanIds,
      }),
    );
    setReturnQuestionSpanId(null);
  }

  function onStuck() {
    if (!path || !active || active.placement !== 'current') return;
    const detourSpanId = pickPrerequisiteDetour(
      CS50P_LECTURE_0_DAG,
      active.sourceSpanId,
    );
    if (!detourSpanId) return;
    const stuckSpanId = active.sourceSpanId;
    const { path: next } = insertDetour({
      path,
      stuckSpanId,
      detourSpanId,
    });
    setWrongAnswers((prev) => [
      ...prev,
      { sourceSpanId: stuckSpanId, recordedAt: new Date().toISOString() },
    ]);
    setReturnQuestionSpanId(stuckSpanId);
    setPath(next);
    const detourSpan = CS50P_LECTURE_0_SPANS.find((s) => s.id === detourSpanId);
    if (detourSpan) setSeekSec(detourSpan.startSec);
  }

  function onDetourDone() {
    if (!path) return;
    const detour = path.find((p) => p.placement === 'detour');
    const restored = completeDetour(path);
    setPath(restored);
    const backId = detour?.returnToSpanId;
    setReturnQuestionSpanId(backId ?? null);
    const back = CS50P_LECTURE_0_SPANS.find((s) => s.id === backId);
    if (back) setSeekSec(back.startSec);
  }

  function onCloseSession() {
    if (!path || !active || active.placement !== 'current') return;
    const span = CS50P_LECTURE_0_SPANS.find((s) => s.id === active.sourceSpanId);
    const concept = span?.concept ?? active.sourceSpanId;
    const closedAt = new Date().toISOString();
    const { card, state } = closeSession({
      state: {
        version: LEARNER_STATE_VERSION,
        courseId: CS50P_LECTURE_0.id,
        path,
        knownSpanIds,
        returnQuestionSpanId,
        wrongAnswers,
        reviewCards,
      },
      sourceSpanId: active.sourceSpanId,
      summary: `${concept} 장면 확인을 마쳤습니다.`,
      closedAt,
      cardId: `review-${active.sourceSpanId}-${closedAt}`,
    });
    setReviewCards(state.reviewCards);
    setLastClosedSummary(card.summary);
  }

  if (!path) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'auto' }}>
        <OnboardingInterview
          spans={CS50P_LECTURE_0_SPANS}
          knownSpanIds={knownSpanIds}
          onToggleKnown={toggleKnown}
          onConfirm={confirmOnboarding}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          maxHeight: '28vh',
          overflow: 'auto',
          borderBottom: '1px solid var(--border-subtle, #1E293B)',
          padding: '0 12px',
        }}
      >
        <PathView path={path} spans={CS50P_LECTURE_0_SPANS} />
        <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
          {active?.placement === 'current' && (
            <button type="button" onClick={onStuck}>
              막힘 — 우회 삽입
            </button>
          )}
          {active?.placement === 'detour' && (
            <button type="button" onClick={onDetourDone}>
              우회 끝 — 원래 질문으로
            </button>
          )}
          {active?.placement === 'current' && (
            <button type="button" onClick={onCloseSession}>
              세션 종료 — ReviewCard
            </button>
          )}
          {notifyPermission !== 'granted' && (
            <button
              type="button"
              onClick={() => {
                void requestReviewNotifyPermission().then(setNotifyPermission);
              }}
            >
              다시 보기 알림 켜기
            </button>
          )}
        </div>
        {lastClosedSummary && (
          <p aria-label="세션 종료 요약" style={{ fontSize: 13, opacity: 0.85 }}>
            저장됨: {lastClosedSummary}
          </p>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <StudyCanvas
          course={CS50P_LECTURE_0}
          seekSec={seekSec}
          tutor={
            <TutorPane
              layoutLabel={layoutLabel}
              footer={
                tutorAllowed && baseTurn ? (
                  <FormulaInput
                    expectedExpr={DEMO_EXPECTED_EXPR}
                    onChecked={(_verdict, learnerExpr) => {
                      setFormulaTurn(
                        applyFormulaVerdict({
                          turn: baseTurn,
                          learnerExpr,
                          expectedExpr: DEMO_EXPECTED_EXPR,
                        }).turn,
                      );
                    }}
                  />
                ) : undefined
              }
            >
              {!tutorAllowed ? (
                <QuotaGate
                  onUnlockPaid={() => {
                    setEntitlement(setPaidUnlock());
                  }}
                />
              ) : (
                turn && (
                  <TutorTurnView
                    turn={turn}
                    spans={CS50P_LECTURE_0_SPANS}
                    onCitationSelected={(e: CitationSelected) =>
                      setSeekSec(e.startSec)
                    }
                  />
                )
              )}
            </TutorPane>
          }
        />
      </div>
    </div>
  );
}
