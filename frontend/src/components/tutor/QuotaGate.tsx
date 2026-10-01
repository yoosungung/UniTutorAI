import { DAILY_FREE_TUTOR_TURN_LIMIT } from '../../lib/tutorQuota';

type Props = {
  onUnlockPaid: () => void;
};

/**
 * Shown when the free daily TutorTurn cap is exhausted.
 * Paid unlock is a local stub/test flag — no payment vendor.
 */
export function QuotaGate({ onUnlockPaid }: Props) {
  return (
    <div
      role="region"
      aria-label="무료 문답 한도"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '8px 0',
      }}
    >
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
        오늘 무료 문답 {DAILY_FREE_TUTOR_TURN_LIMIT}회를 모두 썼어요. 유료로
        해제하면 문답이 막히지 않습니다.
      </p>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
        광고 보상 충전은 후속 단계에서 이어집니다.
      </p>
      <button type="button" onClick={onUnlockPaid}>
        유료로 문답 해제 (테스트)
      </button>
    </div>
  );
}
