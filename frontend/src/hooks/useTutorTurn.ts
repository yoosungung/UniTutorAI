import { useEffect, useState } from 'react';
import { loadByokApiKey } from '../lib/byok';
import { isOnDeviceEnabled } from '../lib/onDevice';
import { runOnDeviceTutorTurn } from '../lib/onDeviceTutor';
import { streamTutorTurn } from '../lib/tutorStream';
import type { TutorTurn } from '../types/tutorTurn';

export type UseTutorTurnInput = {
  courseId: string;
  sourceSpanId: string | undefined;
  concept?: string;
  /** When true (default in DEV), use local template if SSE fails. */
  allowLocalFallback?: boolean;
  localFallback?: (spanId: string) => TutorTurn;
  /** Bump to re-fetch when BYOK register/clear changes. */
  byokEpoch?: number;
  /** Bump to re-fetch when on-device opt-in toggles. */
  onDeviceEpoch?: number;
};

export type UseTutorTurnState = {
  turn: TutorTurn | null;
  streamingQuestion: string;
  error: string | null;
  loading: boolean;
};

/**
 * Loads a TutorTurn. Priority when on-device is enabled:
 * on-device WebLLM → (explicit unsupported/failed, no silent cloud).
 * Otherwise: Workers SSE (+ optional BYOK header).
 */
export function useTutorTurn(input: UseTutorTurnInput): UseTutorTurnState {
  const [turn, setTurn] = useState<TutorTurn | null>(null);
  const [streamingQuestion, setStreamingQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const spanId = input.sourceSpanId;
  const courseId = input.courseId;
  const concept = input.concept;
  const allowLocalFallback = input.allowLocalFallback;
  const localFallback = input.localFallback;
  const byokEpoch = input.byokEpoch ?? 0;
  const onDeviceEpoch = input.onDeviceEpoch ?? 0;

  useEffect(() => {
    if (!spanId) {
      setTurn(null);
      setStreamingQuestion('');
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreamingQuestion('');
    setTurn(null);

    void (async () => {
      if (isOnDeviceEnabled()) {
        const local = await runOnDeviceTutorTurn(
          { courseId, sourceSpanId: spanId, concept },
          {
            onDelta: (text) => {
              if (cancelled) return;
              setStreamingQuestion(text);
            },
            onError: (err) => {
              if (cancelled) return;
              setError(err);
            },
          },
        );
        if (cancelled) return;
        if (local) {
          setTurn(local);
          setStreamingQuestion(local.question);
          setLoading(false);
          return;
        }
        // Opt-in local path: never silently fall through to cloud.
        setLoading(false);
        return;
      }

      let assembled = '';
      const result = await streamTutorTurn(
        {
          courseId,
          sourceSpanId: spanId,
          concept,
        },
        {
          onDelta: (text) => {
            if (cancelled) return;
            assembled += text;
            setStreamingQuestion(assembled);
          },
          onError: (err) => {
            if (cancelled) return;
            setError(err);
          },
        },
        { signal: ac.signal, byokApiKey: loadByokApiKey() },
      );

      if (cancelled) return;

      if (result) {
        setTurn(result);
        setStreamingQuestion(result.question);
        setLoading(false);
        return;
      }

      if (allowLocalFallback && localFallback) {
        const fallback = localFallback(spanId);
        setTurn(fallback);
        setStreamingQuestion(fallback.question);
        setLoading(false);
        return;
      }

      setLoading(false);
    })().catch((e: unknown) => {
      if (cancelled || ac.signal.aborted) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'stream_failed';
      if (allowLocalFallback && localFallback && spanId && !isOnDeviceEnabled()) {
        const fallback = localFallback(spanId);
        setTurn(fallback);
        setStreamingQuestion(fallback.question);
        setError(msg);
      } else {
        setError(msg);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [
    spanId,
    courseId,
    concept,
    allowLocalFallback,
    localFallback,
    byokEpoch,
    onDeviceEpoch,
  ]);

  return { turn, streamingQuestion, error, loading };
}
