import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-toc-ready', 'true');
  await expect(page.locator('#benchmark-matrix .benchmark-table')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function centeringError(page) {
  return page.locator('.showcase-hero').evaluate((el) => {
    const box = el.getBoundingClientRect();
    return Math.abs((box.left + box.right) / 2 - document.documentElement.clientWidth / 2);
  });
}

test('drawer and article animate together and the closed article centers', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const openError = await centeringError(page);
  expect(openError).toBeGreaterThan(100);
  const running = await page.evaluate(async () => {
    (document.querySelector('.toc-toggle') as HTMLButtonElement).click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return ['.report-page', '.report-toc'].map((selector) =>
      document
        .querySelector(selector)!
        .getAnimations()
        .some((animation) => animation.playState === 'running'),
    );
  });
  expect(running).toEqual([true, true]);
  await expect.poll(() => centeringError(page)).toBeLessThan(1);
  await expect(page.locator('.report-toc')).toHaveAttribute('inert', '');
  await expect(page.locator('#report-toc-links')).not.toHaveAttribute('hidden');
  await page.getByRole('button', { name: 'Toggle Contents' }).click();
  await expect.poll(() => centeringError(page)).toBeCloseTo(openError, 0);
  await expect(page.locator('.report-toc')).not.toHaveAttribute('inert');
});

test('contents links scroll smoothly with native hashes below both bars', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const start = await page
    .locator('.report-toc a[href="#comparison"]')
    .evaluate((link: HTMLAnchorElement) => {
      const before = scrollY;
      link.click();
      return { before, immediate: scrollY };
    });
  expect(start.immediate).toBe(start.before);
  await expect(page).toHaveURL(/#comparison$/);
  await expect
    .poll(() =>
      page
        .locator('#comparison')
        .evaluate((el) =>
          Math.abs(
            el.getBoundingClientRect().top -
              parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
          ),
        ),
    )
    .toBeLessThan(2);
  const bottom = await page
    .locator('.contents-toolbar')
    .evaluate((el) => el.getBoundingClientRect().bottom);
  expect((await page.locator('#comparison').boundingBox())!.y).toBeGreaterThan(bottom);
});

test('mobile drawer overlays centered text and reduced motion is immediate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect.poll(() => centeringError(page)).toBeLessThan(1);
  const toggle = page.getByRole('button', { name: 'Toggle Contents' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(await centeringError(page)).toBeLessThan(1);
  const toolbar = (await page.locator('.contents-toolbar').boundingBox())!;
  expect((await page.locator('.report-toc').boundingBox())!.y).toBeCloseTo(
    toolbar.y + toolbar.height,
    0,
  );
  await page.locator('.report-toc a[href="#setup"]').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('.report-page')).toHaveCSS('transition-duration', '0s');
  await expect.poll(() => centeringError(page)).toBeLessThan(1);
});
