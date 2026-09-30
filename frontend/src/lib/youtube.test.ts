import { describe, expect, it } from 'vitest';
import { embedUrlFromPlaybackUrl, videoIdFromPlaybackUrl } from './youtube';

describe('youtube helpers', () => {
  it('extracts video id from watch URL', () => {
    expect(
      videoIdFromPlaybackUrl('https://www.youtube.com/watch?v=fNk_zzaMoSs'),
    ).toBe('fNk_zzaMoSs');
  });

  it('extracts video id from youtu.be short URL', () => {
    expect(videoIdFromPlaybackUrl('https://youtu.be/fNk_zzaMoSs')).toBe(
      'fNk_zzaMoSs',
    );
  });

  it('builds nocookie embed URL without storing media', () => {
    expect(
      embedUrlFromPlaybackUrl('https://www.youtube.com/watch?v=fNk_zzaMoSs'),
    ).toBe('https://www.youtube-nocookie.com/embed/fNk_zzaMoSs');
  });

  it('returns null for non-YouTube URLs', () => {
    expect(videoIdFromPlaybackUrl('https://example.com/video.mp4')).toBeNull();
    expect(embedUrlFromPlaybackUrl('https://example.com/video.mp4')).toBeNull();
  });
});
