import { useState } from 'react';
import {
  isOnDeviceEnabled,
  probeOnDeviceCapability,
  setOnDeviceEnabled,
} from '../../lib/onDevice';

type Props = {
  onChanged?: (enabled: boolean) => void;
};

/**
 * Opt-in on-device WebLLM TutorTurn. Off by default so cloud/BYOK paths stay
 * the product default (cost/privacy boundary unchanged until the learner chooses).
 */
export function OnDevicePanel({ onChanged }: Props) {
  const [enabled, setEnabled] = useState(() => isOnDeviceEnabled());
  const capability = probeOnDeviceCapability();

  function toggle(next: boolean) {
    if (!setOnDeviceEnabled(next)) return;
    setEnabled(next);
    onChanged?.(next);
  }

  return (
    <div
      role="region"
      aria-label="온디바이스 로컬 모델"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '4px 0',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
        이 기기에서 작은 언어 모델을 쓰면 클라우드 추론 없이 문답할 수 있어요.
        첫 로드는 모델 다운로드가 필요하고, WebGPU가 없으면 지원하지 않는다고
        안내합니다.
      </p>
      {!capability.ok ? (
        <p style={{ margin: 0, fontSize: 13 }} role="status">
          이 브라우저는 WebGPU를 지원하지 않아 온디바이스 경로를 쓸 수 없습니다
          (`on_device_unsupported`).
        </p>
      ) : null}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          disabled={!capability.ok && !enabled}
          onChange={(e) => toggle(e.target.checked)}
        />
        온디바이스 로컬 모델 사용
      </label>
    </div>
  );
}
