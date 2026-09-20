import { test, expect } from '@playwright/test';

test('bibliography numbers stay on one line and BibTeX uses a readable code block', async ({
  page,
}) => {
  await page.goto('/');
  const reference = page.locator('.report-reference-list li').first();
  const marker = await reference.evaluate((el) => {
    const style = getComputedStyle(el, '::before');
    return { width: parseFloat(style.width), whiteSpace: style.whiteSpace, left: style.left };
  });
  expect(marker.width).toBeGreaterThanOrEqual(24);
  expect(marker.whiteSpace).toBe('nowrap');
  expect(marker.left).toBe('0px');
  const code = page.locator('.report-citation code');
  await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(code).toContainText('@techreport{yao2026frontier,');
  expect(await code.evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    await code.locator('..').evaluate((el) => getComputedStyle(el).fontSize),
  );
});

test('playback renders a real pause glyph, not an empty icon', async ({ page }) => {
  await page.goto('/');
  const player = page.locator('.execution-demo');
  const video = player.locator('video');
  await player.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  await player.getByRole('button', { name: 'Play episode', exact: true }).click();
  const pause = player.getByRole('button', { name: 'Pause episode', exact: true });
  await expect(pause).toBeVisible();
  const geometry = await pause.locator('svg').evaluate((svg: SVGSVGElement) => {
    const box = svg.getBBox();
    return { width: box.width, height: box.height };
  });
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.height).toBeGreaterThan(0);
  await pause.click();
  await expect(player.getByRole('button', { name: 'Play episode', exact: true })).toBeVisible();
});
