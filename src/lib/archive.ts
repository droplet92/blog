type PostMeta = {
  slug: string;
  title: string;
  topic: 'music' | 'game' | 'dev' | 'translation';
  date: string; // YYYY-MM-DD
};

export type YearGroup = {
  year: number;
  posts: PostMeta[];
};

export type EmptyTimeBar = {
  from: string;
  to: string;
  days: number;
};

const toDate = (value: string) => new Date(`${value}T00:00:00Z`);

const sortByDateDesc = <T extends { date: string }>(items: T[]) =>
  [...items].sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());

export const groupByYear = (posts: PostMeta[]): YearGroup[] => {
  const sorted = sortByDateDesc(posts);
  const map = new Map<number, PostMeta[]>();

  for (const post of sorted) {
    const year = toDate(post.date).getUTCFullYear();
    const list = map.get(year) ?? [];
    list.push(post);
    map.set(year, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, grouped]) => ({ year, posts: grouped }));
};

export const buildRecentList = (posts: PostMeta[], count = 3): PostMeta[] => {
  return sortByDateDesc(posts).slice(0, count);
};

export const computeEmptyTimeBars = (posts: PostMeta[]): EmptyTimeBar[] => {
  const sorted = sortByDateDesc(posts);
  const bars: EmptyTimeBar[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const from = sorted[i].date;
    const to = sorted[i + 1].date;
    const diffMs = Math.abs(toDate(from).getTime() - toDate(to).getTime());
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    bars.push({ from, to, days });
  }

  return bars;
};
