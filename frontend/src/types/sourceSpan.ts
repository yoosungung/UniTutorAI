/** SourceSpan — ARCHITECTURE.md §2.2 */
export type SourceSpan = {
  id: string;
  courseId: string;
  concept: string;
  startSec: number;
  endSec: number;
  slideLabel?: string;
};
