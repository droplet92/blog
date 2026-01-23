import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  outDir: './docs',
  site: 'https://droplet92.github.io',
  base: '/blog'
});
