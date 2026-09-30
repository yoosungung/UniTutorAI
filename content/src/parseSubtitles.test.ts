import { describe, expect, it } from 'vitest';
import { parseSubtitles } from './parseSubtitles';

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:01,500
Hello world

2
00:00:01,500 --> 00:00:03,000
Second cue
`;

const SAMPLE_VTT = `WEBVTT

00:00:00.000 --> 00:00:01.500 align:middle line:90%
Hello world

00:00:01.500 --> 00:00:03.000
Second cue
`;

describe('parseSubtitles', () => {
  it('parses SRT cues into start/end seconds and text', () => {
    const cues = parseSubtitles(SAMPLE_SRT);
    expect(cues).toEqual([
      { startSec: 0, endSec: 1.5, text: 'Hello world' },
      { startSec: 1.5, endSec: 3, text: 'Second cue' },
    ]);
  });

  it('parses VTT cues and ignores WEBVTT header / cue settings', () => {
    const cues = parseSubtitles(SAMPLE_VTT);
    expect(cues).toEqual([
      { startSec: 0, endSec: 1.5, text: 'Hello world' },
      { startSec: 1.5, endSec: 3, text: 'Second cue' },
    ]);
  });

  it('skips empty cue bodies', () => {
    const cues = parseSubtitles(`WEBVTT

00:00:00.000 --> 00:00:01.000


00:00:01.000 --> 00:00:02.000
Spoken
`);
    expect(cues).toEqual([{ startSec: 1, endSec: 2, text: 'Spoken' }]);
  });
});
