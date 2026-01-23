// Compatibility export.
// Posts are authored in `post/*.{txt,md}` and auto-loaded via `getPosts()`.

import { getPosts, type Post } from '../lib/posts';

export const posts: Post[] = await getPosts();
export type { Post };
