export type ReaderBlock =
  | { type: 'p'; text: string }
  | { type: 'youtube'; id: string }
  | { type: 'spotify'; kind: 'track' | 'album' | 'playlist'; id: string };

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function extractYouTubeIdFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);

    // youtu.be/<id>
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    // youtube.com / m.youtube.com / www.youtube.com
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      // /watch?v=<id>
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v') ?? '';
        return YOUTUBE_ID_RE.test(id) ? id : null;
      }

      // /embed/<id>
      const embedMatch = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      // /shorts/<id>
      const shortsMatch = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

const SPOTIFY_ID_RE = /^[A-Za-z0-9]{16,64}$/;

function extractSpotifyFromUrl(
  urlString: string
): { kind: 'track' | 'album' | 'playlist'; id: string } | null {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./, '');

    if (host !== 'open.spotify.com') return null;

    const match = url.pathname.match(/^\/(track|album|playlist)\/([^/?#]+)/);
    if (!match) return null;

    const kind = match[1] as 'track' | 'album' | 'playlist';
    const id = match[2];
    if (!SPOTIFY_ID_RE.test(id)) return null;

    return { kind, id };
  } catch {
    return null;
  }
}

function collectEmbedsAndCleanText(text: string): { cleanText: string; embeds: ReaderBlock[] } {
  const embeds: ReaderBlock[] = [];
  const youtubeIds: string[] = [];

  // Rough URL matcher (kept intentionally simple and strict to avoid false positives).
  const urlRe = /(https?:\/\/[^\s<>()\]]+)/g;

  const cleanText = text.replace(urlRe, (rawUrl) => {
    const id = extractYouTubeIdFromUrl(rawUrl);
    if (id) {
      if (!youtubeIds.includes(id)) youtubeIds.push(id);
      embeds.push({ type: 'youtube', id });
      // Remove the link from visible text so the embed becomes the representation.
      return '';
    }

    const sp = extractSpotifyFromUrl(rawUrl);
    if (sp) {
      embeds.push({ type: 'spotify', kind: sp.kind, id: sp.id });
      return '';
    }

    return rawUrl;
  });

  // De-dupe consecutive duplicates for YouTube (common when the same link appears multiple times).
  // Note: Keep Spotify embeds as-is; duplicates may be intentional (e.g., list of tracks).
  const compactEmbeds: ReaderBlock[] = [];
  for (const e of embeds) {
    const prev = compactEmbeds[compactEmbeds.length - 1];
    if (prev && prev.type === 'youtube' && e.type === 'youtube' && prev.id === e.id) continue;
    compactEmbeds.push(e);
  }

  return { cleanText: cleanText.replace(/\s{2,}/g, ' ').trim(), embeds: compactEmbeds };
}

export function buildReaderBlocks(content: string): ReaderBlock[] {
  const paragraphs = String(content)
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: ReaderBlock[] = [];

  for (const paragraph of paragraphs) {
    const { cleanText, embeds } = collectEmbedsAndCleanText(paragraph);

    if (cleanText) {
      blocks.push({ type: 'p', text: cleanText });
    }

    blocks.push(...embeds);
  }

  return blocks;
}
