import { useEffect, useState } from 'react';
import { streamTutorTurn } from '../lib/tutorStream';
import type { TutorTurn } from '../types/tutorTurn';

export type UseTutorTurnInput = {
  courseId: string;
  sourceSpanId: string | undefined;
  concept?: string;
  /** When true (default in DEV), use local template if SSE fails. */
  allowLocalFallback?: boolean;
  localFallback?: (spanId: string) => TutorTurn;
};

export type UseTutorTurnState = {
  turn: TutorTurn | null;
  streamingQuestion: string;
  error: string | null;
  loading: boolean;
};

/**
 * Loads a TutorTurn from Workers SSE when sourceSpanId changes.
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
        { signal: ac.signal },
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
      if (allowLocalFallback && localFallback && spanId) {
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
  }, [spanId, courseId, concept, allowLocalFallback, localFallback]);

  return { turn, streamingQuestion, error, loading };
}
