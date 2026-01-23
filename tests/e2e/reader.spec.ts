import { test, expect, disableAnimations, getPostSlugsFromHome } from './fixtures';

test.describe('Reader page', () => {
  test('shows single-focus reading layout and no UI chrome', async ({ page }) => {
    const slugs = await getPostSlugsFromHome(page);
    expect(slugs.length).toBeGreaterThan(0);
    await page.goto(`/blog/posts/${slugs[0]}`);

    await expect(page.getByTestId('reader-title')).toBeVisible();
    await expect(page.getByTestId('reader-date')).toBeVisible();
    await expect(page.getByTestId('reader-content')).toBeVisible();

    await expect(page.getByText('I WANNA BE A CAPYBARA...')).toHaveCount(0);
    await expect(page.getByTestId('site-footer')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });

  test('screenshots: reader pages (mobile + desktop)', async ({ page }) => {
    const slugs = await getPostSlugsFromHome(page);
    expect(slugs.length).toBeGreaterThan(0);

    const targetSlugs = slugs.slice(0, 7);

    for (const slug of targetSlugs) {
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto(`/blog/posts/${slug}`);
      await disableAnimations(page);

      await expect(page.getByTestId('reader-title')).toBeVisible();
      await expect(page.getByTestId('reader-date')).toBeVisible();
      await expect(page.getByTestId('reader-content')).toBeVisible();

      await page.screenshot({
        path: `test-results/latest/reader-${slug}.png`,
        animations: 'disabled',
        caret: 'hide'
      });

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/blog/posts/${slug}`);
      await disableAnimations(page);

      await expect(page.getByTestId('reader-title')).toBeVisible();
      await expect(page.getByTestId('reader-date')).toBeVisible();
      await expect(page.getByTestId('reader-content')).toBeVisible();

      await page.screenshot({
        path: `test-results/latest/reader-desktop-${slug}.png`,
        animations: 'disabled',
        caret: 'hide'
      });
    }
  });
});
