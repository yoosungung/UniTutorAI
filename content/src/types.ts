/** Shared course shapes for batch output — ARCHITECTURE.md §2.1–§2.2 */

export type CourseRef = {
  id: string;
  title: string;
  subject: string;
  playbackUrl: string;
};

export type SourceSpan = {
  id: string;
  courseId: string;
  concept: string;
  startSec: number;
  endSec: number;
  slideLabel?: string;
};

export type SubtitleCue = {
  startSec: number;
  endSec: number;
  text: string;
};

/** Ordered concept markers used once at batch time (not at runtime). */
export type ConceptMarker = {
  concept: string;
  /** Inclusive start in seconds (from VTT/SRT alignment). */
  startSec: number;
  slideLabel?: string;
};
