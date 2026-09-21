import { test, expect } from '@playwright/test';

test('header keeps both wordmarks beside a light, usable contents button', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1800, 1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const toggle = page.getByRole('button', { name: 'Toggle Contents' });
    const button = (await toggle.boundingBox())!;
    const brand = (await page.locator('.brand-lockup').boundingBox())!;
    const icon = (await toggle.locator('svg').boundingBox())!;
    expect(brand.x - button.x - button.width).toBeGreaterThanOrEqual(0);
    expect(brand.x - button.x - button.width).toBeLessThanOrEqual(20);
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
