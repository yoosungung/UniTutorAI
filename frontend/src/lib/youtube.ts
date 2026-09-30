export function videoIdFromPlaybackUrl(playbackUrl: string): string | null {
  try {
    const url = new URL(playbackUrl);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/')[2];
        return id || null;
      }
      const v = url.searchParams.get('v');
      return v || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function embedUrlFromPlaybackUrl(
  playbackUrl: string,
  startSec?: number,
): string | null {
  const id = videoIdFromPlaybackUrl(playbackUrl);
  if (!id) return null;
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  if (startSec == null || !Number.isFinite(startSec) || startSec <= 0) {
    return base;
  }
  return `${base}?start=${Math.floor(startSec)}`;
}
