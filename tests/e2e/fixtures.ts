import { test as base, expect, type Page } from '@playwright/test';

export async function disableAnimations(page: Page) {
  await page.addStyleTag({
    content:
      '*{animation:none!important;transition:none!important}html{scroll-behavior:auto!important}'
  });
}

export async function getPostSlugsFromHome(page: Page): Promise<string[]> {
  await page.goto('/');
  const hrefs = await page.getByTestId('post-link').evaluateAll((els) =>
    els
      .map((el) => (el instanceof HTMLAnchorElement ? el.getAttribute('href') : null))
      .filter((v): v is string => Boolean(v))
  );

  const slugs = hrefs
    .map((href) => {
      const match = href.match(/\/posts\/([^/?#]+)/);
      return match?.[1] ?? null;
    })
    .filter((v): v is string => Boolean(v));

  return Array.from(new Set(slugs));
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (globalThis as any).__E2E_FIXED_BG__ = true;
    });
    await use(page);
  }
});

export { expect };
