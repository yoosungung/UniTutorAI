import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ON_DEVICE_MODEL_ID,
  ON_DEVICE_STORAGE_KEY,
  isOnDeviceEnabled,
  probeOnDeviceCapability,
  setOnDeviceEnabled,
} from './onDevice';
import { runOnDeviceTutorTurn } from './onDeviceTutor';

describe('probeOnDeviceCapability', () => {
  it('reports webgpu_unavailable when navigator.gpu is missing', () => {
    const nav = { gpu: undefined } as unknown as Navigator;
    expect(probeOnDeviceCapability(nav)).toEqual({
      ok: false,
      reason: 'webgpu_unavailable',
    });
  });

  it('reports ok when navigator.gpu exists', () => {
    const nav = { gpu: {} } as unknown as Navigator;
    expect(probeOnDeviceCapability(nav)).toEqual({ ok: true });
  });
});

describe('on-device preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to disabled', () => {
    expect(isOnDeviceEnabled()).toBe(false);
  });

  it('persists opt-in in localStorage', () => {
    expect(setOnDeviceEnabled(true)).toBe(true);
    expect(isOnDeviceEnabled()).toBe(true);
    expect(localStorage.getItem(ON_DEVICE_STORAGE_KEY)).toContain('true');
    expect(setOnDeviceEnabled(false)).toBe(true);
    expect(isOnDeviceEnabled()).toBe(false);
  });
});

describe('runOnDeviceTutorTurn', () => {
  it('returns null with on_device_disabled when preference is off', async () => {
    const errors: string[] = [];
    const result = await runOnDeviceTutorTurn(
      { courseId: 'c', sourceSpanId: 'span-a', concept: '변수' },
      { onError: (e) => errors.push(e) },
      {
        isEnabled: () => false,
        probe: () => ({ ok: true }),
        createEngine: async () => {
          throw new Error('should_not_create');
        },
      },
    );
    expect(result).toBeNull();
    expect(errors).toEqual(['on_device_disabled']);
  });

  it('returns null with on_device_unsupported when WebGPU is missing', async () => {
    const errors: string[] = [];
    const result = await runOnDeviceTutorTurn(
      { courseId: 'c', sourceSpanId: 'span-a' },
      { onError: (e) => errors.push(e) },
      {
        isEnabled: () => true,
        probe: () => ({ ok: false, reason: 'webgpu_unavailable' }),
        createEngine: async () => {
          throw new Error('should_not_create');
        },
      },
    );
    expect(result).toBeNull();
    expect(errors).toEqual(['on_device_unsupported']);
  });

  it('loads a local engine and returns one valid TutorTurn (success path)', async () => {
    const createEngine = vi.fn(async () => ({
      chat: {
        completions: {
          create: vi.fn(async () => ({
            choices: [
              {
                message: {
                  content: '변수 장면에서 핵심을 한 문장으로 말해 볼까요?',
                },
              },
            ],
          })),
        },
      },
    }));

    const result = await runOnDeviceTutorTurn(
      { courseId: 'c', sourceSpanId: 'span-a', concept: '변수' },
      {},
      {
        isEnabled: () => true,
        probe: () => ({ ok: true }),
        createEngine,
        modelId: DEFAULT_ON_DEVICE_MODEL_ID,
      },
    );

    expect(createEngine).toHaveBeenCalledWith(
      DEFAULT_ON_DEVICE_MODEL_ID,
      expect.any(Function),
    );
    expect(result?.sourceSpanId).toBe('span-a');
    expect(result?.question).toContain('변수');
    expect(result?.citations).toEqual(['span-a']);
    expect(result?.scope).toBe('in_lecture');
  });
});
