import { test, expect } from '@playwright/test';

test('shared icons stay compact and masthead actions do not wrap', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const icons = page.locator('.hero-actions svg, .demonstration-card svg');
    await expect(icons).toHaveCount(3);
    for (const svg of await icons.all()) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      const box = await svg.boundingBox();
      expect(box!.width).toBeGreaterThan(10);
      expect(box!.width).toBeLessThanOrEqual(24);
      expect(box!.height).toBeLessThanOrEqual(24);
    }
    await expect(page.locator('.hero-primary')).toHaveCSS('white-space', 'nowrap');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  }
});

test('seeking does not insert a buffering message or shift playback controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#direct-episodes video')).toHaveCount(1);
  await expect(page.locator('#direct-episodes [data-counter]')).toContainText('Interaction');
  const control = page.locator('#direct-episodes .episode-controls');
  await control.scrollIntoViewIfNeeded();
  const before = await control.boundingBox();
  await page
    .locator('#direct-episodes video')
    .evaluate((video) => video.dispatchEvent(new Event('waiting')));
  await expect(page.locator('#direct-episodes .episode-caption')).toBeEmpty();
  const after = await control.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 1);
  const stem = await page
    .locator('.episode-chapter')
    .first()
    .evaluate((e) => getComputedStyle(e, '::before').content);
  expect(['none', 'normal']).toContain(stem);
});
