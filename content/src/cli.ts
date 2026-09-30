#!/usr/bin/env node
/**
 * Batch CLI: subtitles + concept markers → SourceSpan JSON (run once offline).
 *
 * Usage:
 *   npm run batch -- \
 *     --course fixtures/cs50p-lecture0/course.json \
 *     --concepts fixtures/cs50p-lecture0/concepts.json \
 *     --subtitles fixtures/cs50p-lecture0/lecture0.vtt \
 *     --out fixtures/cs50p-lecture0/sourceSpans.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSourceSpans } from './buildSpans';
import { parseSubtitles } from './parseSubtitles';
import { assertValidSourceSpans } from './validateSpans';
import type { ConceptMarker, CourseRef } from './types';

function arg(flag: string): string {
  const i = process.argv.indexOf(flag);
  if (i < 0 || !process.argv[i + 1]) {
    throw new Error(`missing ${flag}`);
  }
  return resolve(process.argv[i + 1]);
}

function main(): void {
  const coursePath = arg('--course');
  const conceptsPath = arg('--concepts');
  const subtitlesPath = arg('--subtitles');
  const outPath = arg('--out');

  const course = JSON.parse(readFileSync(coursePath, 'utf8')) as CourseRef;
  const markers = JSON.parse(
    readFileSync(conceptsPath, 'utf8'),
  ) as ConceptMarker[];
  const cues = parseSubtitles(readFileSync(subtitlesPath, 'utf8'));
  const spans = buildSourceSpans({
    courseId: course.id,
    markers,
    cues,
  });
  assertValidSourceSpans(spans, course.id);

  writeFileSync(outPath, `${JSON.stringify(spans, null, 2)}\n`, 'utf8');
  console.log(`wrote ${spans.length} SourceSpan(s) → ${outPath}`);
}

main();
