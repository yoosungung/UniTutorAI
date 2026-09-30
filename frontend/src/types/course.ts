/** CourseRef — ARCHITECTURE.md §2.1 */
export type CourseRef = {
  id: string;
  title: string;
  subject: string;
  /** URL the in-app player opens (YouTube watch/share); no local media file. */
  playbackUrl: string;
};
