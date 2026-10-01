/**
 * Approved first course (CS50P Lecture 0) — batch SourceSpans live under content/fixtures.
 * Runtime loads static JSON only; no re-indexing.
 */
import type { CourseRef } from '../types/course';
import type { KnowledgeDag } from '../types/path';
import type { SourceSpan } from '../types/sourceSpan';
import courseJson from '../../../content/fixtures/cs50p-lecture0/course.json';
import knowledgeDagJson from '../../../content/fixtures/cs50p-lecture0/knowledgeDag.json';
import sourceSpansJson from '../../../content/fixtures/cs50p-lecture0/sourceSpans.json';

export const CS50P_LECTURE_0: CourseRef = courseJson;

/** Pre-built SourceSpan fixture from offline VTT·slide batch. */
export const CS50P_LECTURE_0_SPANS: SourceSpan[] = sourceSpansJson;

/** Static knowledge DAG (prerequisites) — same course package as SourceSpans. */
export const CS50P_LECTURE_0_DAG: KnowledgeDag = knowledgeDagJson;
