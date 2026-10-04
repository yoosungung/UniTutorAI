import {
  DEFAULT_ON_DEVICE_MODEL_ID,
  isOnDeviceEnabled,
  probeOnDeviceCapability,
  type OnDeviceCapability,
} from './onDevice';
import { assertValidTutorTurn } from './tutorTurn';
import type { EscalationStep, TutorTurn } from '../types/tutorTurn';

export type OnDeviceTutorRequest = {
  courseId: string;
  sourceSpanId: string;
  concept?: string;
  escalationStep?: EscalationStep;
  learnerMessage?: string;
};

export type OnDeviceTutorHandlers = {
  onDelta?: (text: string) => void;
  onProgress?: (text: string) => void;
  onError?: (error: string) => void;
};

/** Minimal OpenAI-style chat surface used by WebLLM / mocks. */
export type OnDeviceChatEngine = {
  chat: {
    completions: {
      create: (req: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
};

export type OnDeviceTutorDeps = {
  isEnabled?: () => boolean;
  probe?: () => OnDeviceCapability;
  createEngine?: (
    modelId: string,
    onProgress: (text: string) => void,
  ) => Promise<OnDeviceChatEngine>;
  modelId?: string;
};

function buildPrompt(req: OnDeviceTutorRequest): string {
  const concept = req.concept?.trim() || req.sourceSpanId;
  const step = req.escalationStep ?? 1;
  const learner = req.learnerMessage?.trim();
  return [
    'You are a Socratic tutor for one lecture clip.',
    'Reply with ONE short guiding question in Korean only.',
    'Do not give the answer, solution, or worked steps.',
    `courseId=${req.courseId}`,
    `sourceSpanId=${req.sourceSpanId}`,
    `concept=${concept}`,
    `escalationStep=${step}`,
    learner ? `learnerMessage=${learner}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function defaultCreateEngine(
  modelId: string,
  onProgress: (text: string) => void,
): Promise<OnDeviceChatEngine> {
  const { createWebLlmEngine } = await import('./webLlmEngine');
  return createWebLlmEngine(modelId, onProgress);
}

/**
 * Opt-in on-device TutorTurn. Does not call Workers.
 * Explicit errors: on_device_disabled | on_device_unsupported | on_device_failed.
 */
export async function runOnDeviceTutorTurn(
  req: OnDeviceTutorRequest,
  handlers: OnDeviceTutorHandlers = {},
  deps: OnDeviceTutorDeps = {},
): Promise<TutorTurn | null> {
  const enabled = (deps.isEnabled ?? isOnDeviceEnabled)();
  if (!enabled) {
    handlers.onError?.('on_device_disabled');
    return null;
  }

  const capability = (deps.probe ?? probeOnDeviceCapability)();
  if (!capability.ok) {
    handlers.onError?.('on_device_unsupported');
    return null;
  }

  const modelId = deps.modelId ?? DEFAULT_ON_DEVICE_MODEL_ID;
  const createEngine = deps.createEngine ?? defaultCreateEngine;

  try {
    const engine = await createEngine(modelId, (text) => {
      handlers.onProgress?.(text);
    });
    const reply = await engine.chat.completions.create({
      messages: [{ role: 'user', content: buildPrompt(req) }],
      temperature: 0.4,
      max_tokens: 128,
    });
    const question = reply.choices?.[0]?.message?.content?.trim() ?? '';
    if (!question) {
      handlers.onError?.('on_device_failed');
      return null;
    }
    handlers.onDelta?.(question);
    const turn: TutorTurn = {
      id: `on-device-${req.sourceSpanId}-${Date.now()}`,
      sourceSpanId: req.sourceSpanId,
      question,
      escalationStep: req.escalationStep ?? 1,
      citations: [req.sourceSpanId],
      scope: 'in_lecture',
    };
    assertValidTutorTurn(turn);
    return turn;
  } catch {
    handlers.onError?.('on_device_failed');
    return null;
  }
}
