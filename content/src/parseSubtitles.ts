import type { SubtitleCue } from './types';

const TIME =
  /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

function toSec(h: string, m: string, s: string, ms: string): number {
  return (
    Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
  );
}

/**
 * Parse SRT or WebVTT into timed cues. Batch-time only — runtime loads SourceSpan JSON.
 */
export function parseSubtitles(raw: string): SubtitleCue[] {
  const blocks = raw
    .replace(/^\uFEFF/, '')
    .split(/\r?\n\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    if (/^WEBVTT\b/i.test(block) || /^NOTE\b/i.test(block) || /^STYLE\b/i.test(block)) {
      continue;
    }

    const lines = block.split(/\r?\n/);
    let timeLineIdx = lines.findIndex((l) => TIME.test(l));
    if (timeLineIdx < 0) continue;

    const m = lines[timeLineIdx].match(TIME);
    if (!m) continue;

    const startSec = toSec(m[1], m[2], m[3], m[4]);
    const endSec = toSec(m[5], m[6], m[7], m[8]);
    const text = lines
      .slice(timeLineIdx + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!text) continue;
    cues.push({ startSec, endSec, text });
  }

  return cues;
}

export function lectureEndSec(cues: SubtitleCue[]): number {
  if (cues.length === 0) throw new Error('no subtitle cues');
  return cues[cues.length - 1].endSec;
}
