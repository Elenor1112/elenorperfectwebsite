// Extracts the video ID from any common YouTube URL shape (watch, share,
// shorts, embed) so we can build our own privacy-enhanced embed src instead
// of trusting whatever URL an editor pasted in.
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (!u.hostname.includes('youtube.com')) return null;
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const match = u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeEmbedSrc(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}
