import { test, expect, disableAnimations } from './fixtures';

test.describe('Home / Archive', () => {
  test('renders brand and archive list', async ({ page }) => {
    await page.goto('/blog/');

    await expect(page.getByText('I WANNA BE A CAPYBARA...')).toBeVisible();
    await expect(page.getByTestId('archive')).toBeVisible();
    const postCount = await page.getByTestId('post-card').count();
    expect(postCount).toBeGreaterThan(0);
  });

  test('renders metadata row', async ({ page }) => {
    await page.goto('/blog/');

    const firstCard = page.getByTestId('post-card').first();
    const meta = firstCard.getByTestId('card-meta');

    await expect(meta).toBeVisible();
  });

  test('renders titles with detected lang', async ({ page }) => {
    await page.goto('/blog/');

    const titles = page.getByTestId('post-title');
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);

    // `detectLang()` should always set a language tag.
    for (let i = 0; i < Math.min(count, 8); i++) {
      const lang = await titles.nth(i).getAttribute('lang');
      expect(lang).toMatch(/^(ko|ja|en)$/);
    }
  });

  test('navigates to post detail from title link', async ({ page }) => {
    await page.goto('/blog/');

    const firstCard = page.getByTestId('post-card').first();
    await firstCard.getByTestId('post-link').click();
    await expect(page).toHaveURL(/\/posts\//);
    await expect(page.getByTestId('reader-title')).toBeVisible();
  });

  test('mobile-first screenshot', async ({ page }) => {
    await page.goto('/blog/');

    // Reduce visual flakiness.
    await disableAnimations(page);

    // Always emit a human-checkable screenshot artifact.
    // NOTE: Avoid `fullPage: true` here because it can resize the page for capture and
    // introduce snapshot diffs on some environments.
    await page.screenshot({
      path: 'test-results/latest/home-mobile.png',
      animations: 'disabled',
      caret: 'hide'
    });
    await page.getByTestId('site-brand').screenshot({
      path: 'test-results/latest/site-brand.png',
      animations: 'disabled',
      caret: 'hide'
    });
  });

  test('desktop layout is centered (container) and left-aligned (text)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/blog/');

    await disableAnimations(page);

    const main = page.locator('main');
    const mainBox = await main.boundingBox();
    expect(mainBox, 'main should have a bounding box').not.toBeNull();

    const viewportWidth = page.viewportSize()!.width;
    const expectedX = (viewportWidth - mainBox!.width) / 2;
    expect(
      Math.abs(mainBox!.x - expectedX),
      'main should be horizontally centered on desktop'
    ).toBeLessThan(12);

    const brand = page.getByTestId('site-brand');
    const brandBox = await brand.boundingBox();
    expect(brandBox, 'brand should have a bounding box').not.toBeNull();
    const brandInset = brandBox!.x - mainBox!.x;
    expect(brandInset, 'brand should be inset by main padding').toBeGreaterThan(12);
    expect(brandInset, 'brand should be inset by main padding').toBeLessThan(40);

    const bodyAlign = await page.evaluate(() => getComputedStyle(document.body).textAlign);
    expect(bodyAlign).toBe('left');

    const brandAlign = await brand.evaluate((el) => getComputedStyle(el).textAlign);
    expect(brandAlign).toBe('left');

    const firstTitle = page.getByTestId('post-card').first().getByTestId('post-title');
    const titleAlign = await firstTitle.evaluate((el) => getComputedStyle(el).textAlign);
    expect(titleAlign).toBe('left');

    await page.screenshot({
      path: 'test-results/latest/home-desktop.png',
      animations: 'disabled',
      caret: 'hide'
    });
  });

});
