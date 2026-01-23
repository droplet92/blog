export type PostTopic = 'music' | 'game' | 'dev';

export type Post = {
  slug: string;
  title: string;
  topic: PostTopic;
  date: string; // YYYY-MM-DD
  content: string;
};

type Frontmatter = {
  title?: string;
  topic?: string;
  date?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function coerceTopic(value: unknown): PostTopic {
  if (value === 'music' || value === 'game' || value === 'dev') return value;
  return 'dev';
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: normalized.trim() };
  }

  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontmatter: {}, body: normalized.trim() };
  }

  const header = normalized.slice(4, end);
  const body = normalized.slice(end + 5);

  const fm: Frontmatter = {};
  for (const line of header.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    // strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === 'title') fm.title = value;
    if (key === 'topic') fm.topic = value;
    if (key === 'date') fm.date = value;
  }

  return { frontmatter: fm, body: body.trim() };
}

function slugFromPath(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.(md|txt)$/i, '');
}

const files = import.meta.glob('../../post/*.{md,txt}', { as: 'raw' }) as Record<
  string,
  () => Promise<string>
>;

const loaderBySlug: Record<string, () => Promise<string>> = Object.create(null);
for (const [path, loader] of Object.entries(files)) {
  loaderBySlug[slugFromPath(path)] = loader;
}

export async function getPosts(): Promise<Post[]> {
  const entries = await Promise.all(
    Object.entries(files).map(async ([path, loader]) => {
      const slug = slugFromPath(path);
      const raw = await loader();
      const { frontmatter, body } = parseFrontmatter(String(raw));

      const title = frontmatter.title ?? slug;
      const topic = coerceTopic(frontmatter.topic);
      const date = frontmatter.date && DATE_RE.test(frontmatter.date) ? frontmatter.date : '1970-01-01';

      return {
        slug,
        title,
        topic,
        date,
        content: body
      } satisfies Post;
    })
  );

  // Stable order (useful for deterministic builds/tests); UI sorts by date anyway.
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const loader = loaderBySlug[slug];
  if (!loader) return null;

  const raw = await loader();
  const { frontmatter, body } = parseFrontmatter(String(raw));

  const title = frontmatter.title ?? slug;
  const topic = coerceTopic(frontmatter.topic);
  const date = frontmatter.date && DATE_RE.test(frontmatter.date) ? frontmatter.date : '1970-01-01';

  return {
    slug,
    title,
    topic,
    date,
    content: body
  } satisfies Post;
}
