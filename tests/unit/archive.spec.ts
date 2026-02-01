import { describe, it, expect } from 'vitest';
import { buildRecentList } from '../../src/lib/archive';

type PostMeta = {
  slug: string;
  title: string;
  topic: 'music' | 'game' | 'dev' | 'translation';
  date: string; // YYYY-MM-DD
};

const posts: PostMeta[] = [
  { slug: 'a', title: 'A', topic: 'music', date: '2024-12-20' },
  { slug: 'b', title: 'B', topic: 'game', date: '2024-10-01' },
  { slug: 'c', title: 'C', topic: 'dev', date: '2023-05-02' },
  { slug: 'd', title: 'D', topic: 'music', date: '2023-01-15' }
];

describe('archive helpers', () => {
  it('builds the most recent posts in order', () => {
    const recent = buildRecentList(posts, 3);
    expect(recent.map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });
});
