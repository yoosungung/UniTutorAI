/** Browser opt-in for on-device (WebLLM) TutorTurn — no server round-trip. */

export const ON_DEVICE_STORAGE_KEY = 'unitutor:on-device';

/** Small MLC prebuilt suitable for first WebGPU slice (q4). */
export const DEFAULT_ON_DEVICE_MODEL_ID =
  'Phi-3.5-mini-instruct-q4f16_1-MLC' as const;

export type OnDeviceCapability =
  | { ok: true }
  | { ok: false; reason: 'webgpu_unavailable' };

function readRaw(): string | null {
  try {
    return localStorage.getItem(ON_DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): boolean {
  try {
    localStorage.setItem(ON_DEVICE_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function probeOnDeviceCapability(
  nav: Navigator = navigator,
): OnDeviceCapability {
  const gpu = (nav as Navigator & { gpu?: unknown }).gpu;
  if (!gpu) return { ok: false, reason: 'webgpu_unavailable' };
  return { ok: true };
}

export function isOnDeviceEnabled(): boolean {
  const raw = readRaw();
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as { enabled?: unknown };
    return data.enabled === true;
  } catch {
    return false;
  }
}

export function setOnDeviceEnabled(enabled: boolean): boolean {
  return writeRaw(JSON.stringify({ enabled: Boolean(enabled) }));
}
