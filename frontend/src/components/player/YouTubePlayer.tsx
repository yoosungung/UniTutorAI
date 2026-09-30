import type { CourseRef } from '../../types/course';
import { embedUrlFromPlaybackUrl } from '../../lib/youtube';

type Props = {
  course: CourseRef;
  /** Seconds to seek on CitationSelected (embed `start=`). */
  seekSec?: number;
};

/**
 * YouTube iframe only — no local media files (PRODUCT §4.3 / DESIGN §2.2).
 * Isolated DOM so tutor UI never overlays the player (ARCHITECTURE §1).
 * CitationSelected remounts embed with start=SourceSpan.startSec.
 */
export function YouTubePlayer({ course, seekSec }: Props) {
  const src = embedUrlFromPlaybackUrl(course.playbackUrl, seekSec);

  if (!src) {
    return (
      <div
        role="alert"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-elevated, #1F2937)',
          color: 'var(--text-secondary, #94A3B8)',
          fontSize: 14,
        }}
      >
        재생 URL을 열 수 없습니다
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: '#000',
        position: 'relative',
      }}
    >
      <iframe
        key={seekSec ?? 'live'}
        title={course.title}
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
        }}
      />
    </div>
  );
}
