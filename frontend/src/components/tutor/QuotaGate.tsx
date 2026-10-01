import {
  AD_REWARD_TUTOR_TURNS,
  DAILY_FREE_TUTOR_TURN_LIMIT,
} from '../../lib/tutorQuota';

type Props = {
  onUnlockPaid: () => void;
  onWatchAdReward: () => void;
};

/**
 * Shown when the free daily TutorTurn cap is exhausted.
 * Paid unlock + rewarded-ad stubs — no payment vendor / ad SDK in this ticket.
 * BYOK is deferred (product lock).
 */
export function QuotaGate({ onUnlockPaid, onWatchAdReward }: Props) {
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
        오늘 무료 문답 {DAILY_FREE_TUTOR_TURN_LIMIT}회를 모두 썼어요. 광고를 보면{' '}
        {AD_REWARD_TUTOR_TURNS}회를 더 쓰거나, 유료로 해제할 수 있습니다.
      </p>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
        광고 SDK는 스텁입니다(추론 원가 상쇄 경로). BYOK는 후속입니다.
      </p>
      <button type="button" onClick={onWatchAdReward}>
        광고 보고 {AD_REWARD_TUTOR_TURNS}회 충전 (테스트)
      </button>
      <button type="button" onClick={onUnlockPaid}>
        유료로 문답 해제 (테스트)
      </button>
    </div>
  );
}
