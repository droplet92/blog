export type ReaderInline =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; text: string };

export type ReaderBlock =
  | { type: 'p'; inlines: ReaderInline[] }
  | { type: 'h2'; inlines: ReaderInline[] }
  | { type: 'h3'; inlines: ReaderInline[] }
  | { type: 'h4'; inlines: ReaderInline[] }
  | { type: 'image'; src: string; alt: string; title?: string }
  | { type: 'youtube'; id: string }
  | { type: 'spotify'; kind: 'track' | 'album' | 'playlist'; id: string };

const MARKDOWN_IMAGE_RE =
  /^!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+("([^"]*)"|'([^']*)'))?\s*\)$/;

function isSafeImageSrc(src: string): boolean {
  // Prefer stable, deploy-safe URLs.
  // - /... will be resolved against BASE_URL at render-time
  // - http(s) allowed for externally hosted images
  // Disallow data: and javascript: (and other schemes) to avoid footguns.
  if (src.startsWith('/')) return true;
  if (src.startsWith('http://') || src.startsWith('https://')) return true;
  return false;
}

function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (!h) return false;

  // Allow in-site and same-page links.
  if (h.startsWith('/') || h.startsWith('#') || h.startsWith('./') || h.startsWith('../')) return true;

  // Allow basic schemes that make sense for a blog.
  if (h.startsWith('http://') || h.startsWith('https://')) return true;
  if (h.startsWith('mailto:')) return true;

  // Disallow javascript:, data:, file:, etc.
  return false;
}

function tryParseMarkdownImageParagraph(paragraph: string): ReaderBlock | null {
  const match = paragraph.trim().match(MARKDOWN_IMAGE_RE);
  if (!match) return null;

  const alt = match[1] ?? '';
  const src = match[2] ?? '';
  const title = match[4] ?? match[5] ?? undefined;

  if (!src || !isSafeImageSrc(src)) return null;

  return { type: 'image', src, alt, title };
}

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

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function splitMarkdownLinks(text: string): ReaderInline[] {
  const inlines: ReaderInline[] = [];
  let last = 0;

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const idx = match.index ?? -1;
    if (idx < 0) continue;

    const label = match[1] ?? '';
    const href = match[2] ?? '';

    if (idx > last) {
      inlines.push({ type: 'text', value: text.slice(last, idx) });
    }

    if (label && isSafeHref(href)) {
      inlines.push({ type: 'link', href, text: label });
    } else {
      // If it isn't safe/valid, keep the raw text.
      inlines.push({ type: 'text', value: match[0] });
    }

    last = idx + match[0].length;
  }

  if (last < text.length) {
    inlines.push({ type: 'text', value: text.slice(last) });
  }

  return inlines.length ? inlines : [{ type: 'text', value: text }];
}

function normalizeInlines(inlines: ReaderInline[], opts?: { trimEdges?: boolean }): ReaderInline[] {
  const merged: ReaderInline[] = [];

  for (const inline of inlines) {
    if (inline.type === 'text') {
      const value = inline.value.replace(/\s+/g, ' ');
      if (!value) continue;

      const prev = merged[merged.length - 1];
      if (prev?.type === 'text') {
        prev.value = (prev.value + value).replace(/\s+/g, ' ');
      } else {
        merged.push({ type: 'text', value });
      }
      continue;
    }

    merged.push(inline);
  }

  if (opts?.trimEdges) {
    const first = merged[0];
    if (first?.type === 'text') first.value = first.value.trimStart();
    const last = merged[merged.length - 1];
    if (last?.type === 'text') last.value = last.value.trimEnd();
  }

  return merged.filter((i) => (i.type === 'text' ? i.value.length > 0 : true));
}

function linkifyAndExtractEmbedsFromText(text: string): { inlines: ReaderInline[]; embeds: ReaderBlock[] } {
  const embeds: ReaderBlock[] = [];
  const urlRe = /(https?:\/\/[^\s<>()\]]+)/g;

  const pieces: ReaderInline[] = [];
  let last = 0;

  for (const match of text.matchAll(urlRe)) {
    const idx = match.index ?? -1;
    if (idx < 0) continue;
    const rawUrl = match[1] ?? '';

    if (idx > last) {
      pieces.push({ type: 'text', value: text.slice(last, idx) });
    }

    const ytId = extractYouTubeIdFromUrl(rawUrl);
    if (ytId) {
      embeds.push({ type: 'youtube', id: ytId });
    } else {
      const sp = extractSpotifyFromUrl(rawUrl);
      if (sp) {
        embeds.push({ type: 'spotify', kind: sp.kind, id: sp.id });
      } else if (isSafeHref(rawUrl)) {
        // Auto-link normal URLs.
        pieces.push({ type: 'link', href: rawUrl, text: rawUrl });
      } else {
        pieces.push({ type: 'text', value: rawUrl });
      }
    }

    last = idx + match[0].length;
  }

  if (last < text.length) {
    pieces.push({ type: 'text', value: text.slice(last) });
  }

  // De-dupe consecutive duplicates for YouTube (common when the same link appears multiple times).
  const compactEmbeds: ReaderBlock[] = [];
  for (const e of embeds) {
    const prev = compactEmbeds[compactEmbeds.length - 1];
    if (prev && prev.type === 'youtube' && e.type === 'youtube' && prev.id === e.id) continue;
    compactEmbeds.push(e);
  }

  return { inlines: normalizeInlines(pieces), embeds: compactEmbeds };
}

function parseParagraphToInlinesAndEmbeds(paragraph: string): { inlines: ReaderInline[]; embeds: ReaderBlock[] } {
  const linkSplit = splitMarkdownLinks(paragraph);

  const combinedInlines: ReaderInline[] = [];
  const embeds: ReaderBlock[] = [];

  for (const inline of linkSplit) {
    if (inline.type === 'link') {
      combinedInlines.push(inline);
      continue;
    }

    const { inlines, embeds: extracted } = linkifyAndExtractEmbedsFromText(inline.value);
    combinedInlines.push(...inlines);
    embeds.push(...extracted);
  }

  return { inlines: normalizeInlines(combinedInlines, { trimEdges: true }), embeds };
}

export function buildReaderBlocks(content: string): ReaderBlock[] {
  const paragraphs = String(content)
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: ReaderBlock[] = [];

  for (const paragraph of paragraphs) {
    const headingMatch = paragraph.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2] ?? '';
      const { inlines } = parseParagraphToInlinesAndEmbeds(headingText);

      if (inlines.length) {
        if (level === 2) blocks.push({ type: 'h2', inlines });
        if (level === 3) blocks.push({ type: 'h3', inlines });
        if (level === 4) blocks.push({ type: 'h4', inlines });
      }

      continue;
    }

    const image = tryParseMarkdownImageParagraph(paragraph);
    if (image) {
      blocks.push(image);
      continue;
    }

    // Keep legacy embed extraction behavior, but also add safe hyperlinks.
    const { inlines, embeds } = parseParagraphToInlinesAndEmbeds(paragraph);

    if (inlines.length) {
      blocks.push({ type: 'p', inlines });
    }

    blocks.push(...embeds);
  }

  return blocks;
}
