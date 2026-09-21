import { test, expect } from '@playwright/test';

test('header keeps wordmarks left and the light contents button below it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1800, 1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const toggle = page.getByRole('button', { name: 'Toggle Contents' });
    const button = (await toggle.boundingBox())!;
    const brand = (await page.locator('.brand-lockup').boundingBox())!;
    const logos = page.locator('.brand-lockup img');
    await expect(logos).toHaveCount(2);
    for (const logo of await logos.all()) {
      await expect
        .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true);
      const imageBox = (await logo.boundingBox())!;
      expect(imageBox.width).toBeGreaterThan(80);
      expect(imageBox.height).toBeGreaterThan(10);
      await expect(logo).toBeVisible();
    }
    const icon = (await toggle.locator('svg').boundingBox())!;
    const header = (await page.locator('.header').boundingBox())!;
    expect(button.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(brand.x).toBeLessThanOrEqual(32);
    expect(brand.x + brand.width).toBeLessThanOrEqual(width);
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(icon.width).toBe(22);
    await expect(toggle.locator('svg')).toHaveCSS('stroke-width', '1.5px');
    const wasOpen = await toggle.getAttribute('aria-expanded');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', wasOpen === 'true' ? 'false' : 'true');
  }
});
